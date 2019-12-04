import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import ecs_patterns = require('@aws-cdk/aws-ecs-patterns');
import elbv2 = require("@aws-cdk/aws-elasticloadbalancingv2");
import route53 = require('@aws-cdk/aws-route53');
import acm = require('@aws-cdk/aws-certificatemanager');
import rds = require('@aws-cdk/aws-rds');
import iam = require('@aws-cdk/aws-iam');
import cdk = require('@aws-cdk/core');
import secretsmanager = require('@aws-cdk/aws-secretsmanager');
import { AwsCustomResource } from "@aws-cdk/custom-resources";
import { SubnetType } from '@aws-cdk/aws-ec2';


export interface WordpressLabProps {
  hostedZoneID: string,
  hostedZoneName: string,
  region: string
}

export class WordpressLabStack extends cdk.Stack {

  constructor(scope: cdk.Construct, id: string, props: WordpressLabProps) {
    super(scope, id);

    const vpc = new ec2.Vpc(this, 'VPC-ARC309', {
      maxAzs: 2,
      natGateways: 1,
      cidr: '172.31.0.0/16'
    });

    //ACM and DNS
    const myDomainName = props.hostedZoneName //process.env.MYSUBDOMAIN + ".multi-region.xyz";
    const HZID = props.hostedZoneID //process.env.HOSTEDZONE as string ;
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, "hostedZone", {
      hostedZoneId: HZID,
      zoneName: myDomainName
    })

    const validatedCloudFrontCert = new acm.DnsValidatedCertificate(this, 'validatedCloudFrontCert', {
      hostedZone,
      domainName: `${myDomainName}`,
      region: 'us-east-1'
    });

    const validatedWildCardCert = new acm.DnsValidatedCertificate(this, 'validatedWildCardCertificate', {
      hostedZone,
      domainName: `*.${myDomainName}`,
      region: props.region
    });

    const validatedBlogCert = new acm.DnsValidatedCertificate(this, 'validatedBlogCertificate', {
      hostedZone,
      domainName: `blog.${myDomainName}`,
      region: props.region
    });
    const validatedBlogWildCardCert = new acm.DnsValidatedCertificate(this, 'validatedBlogWildCardCertificate', {
      hostedZone,
      domainName: `*.blog.${myDomainName}`,
      region: props.region
    });

    // Cluster all the containers will run in
    const cluster = new ecs.Cluster(this, 'ecscluster', { vpc });

    const secret = new secretsmanager.Secret(this, 'DBSecret', {
      secretName: "wordpressDBPassword",
      generateSecretString: {
        excludePunctuation: true
      }
    });

    const dbsecuritygroup = new ec2.SecurityGroup(this, 'wordpress-dbsg', {
      vpc: vpc,
      description: "wordpress database security group"
    })
    dbsecuritygroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(3306), "Allow inbound to db")

    const dbClusterParam = new rds.ClusterParameterGroup(this, 'replica-param-aurora', {
      family: 'aurora5.6',
      description: 'Aurora 5.6 DB Cluster Parameter - reinvent 2019',
      parameters: {
        binlog_format: 'MIXED'
      }
    });

    const dbcluster = new rds.DatabaseCluster(this, 'wordpress-db-cluster', {
      engine: rds.DatabaseClusterEngine.AURORA,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      masterUser: {
        username: 'root',
        password: secret.secretValue
      },
      parameterGroup: dbClusterParam,
      defaultDatabaseName: 'wordpress',
      instanceProps: {
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.SMALL),
        securityGroup: dbsecuritygroup,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE,
        },
        vpc
      }
    })

    const wordpressSvc = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'wordpress-svc', {
      cluster: cluster,
      desiredCount: 1,
      memoryLimitMiB: 1024,
      cpu: 512,
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry('wordpress:5.2.3-php7.2-apache'),
        containerPort: 80,
        secrets: {
          'WORDPRESS_DB_PASSWORD': ecs.Secret.fromSecretsManager(secret)
        },
        environment: {
          'WORDPRESS_DB_USER': 'root',
          // 'WORDPRESS_DB_HOST': dbcluster.clusterReadEndpoint.hostname,  //we only want to read, no admin function (dbcluster.clusterEndpoint.hostname)
          'WORDPRESS_DB_HOST': dbcluster.clusterEndpoint.hostname,
          'WORDPRESS_DB_NAME': 'wordpress',
        }
      },
      domainName: "primary.blog." + myDomainName,
      domainZone: hostedZone,
      protocol: elbv2.ApplicationProtocol.HTTPS
    })

    wordpressSvc.listener.addCertificateArns('blogACM', [validatedBlogCert.certificateArn, validatedBlogWildCardCert.certificateArn])

    wordpressSvc.targetGroup.configureHealthCheck({
      port: 'traffic-port',
      path: '/',
      interval: cdk.Duration.seconds(5),
      timeout: cdk.Duration.seconds(4),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 2,
      healthyHttpCodes: "200,301,302"
    })

    //add primary failover alias
    // new route53.CfnRecordSet(this, 'blog-alias-primary', {
    //   name: "blog." + myDomainName + ".",
    //   type: route53.RecordType.A,
    //   hostedZoneId: props.hostedZoneID,
    //   aliasTarget: {
    //     dnsName: "primary.blog." + myDomainName + ".",
    //     evaluateTargetHealth: true,
    //     hostedZoneId: props.hostedZoneID
    //   },
    //   failover: "PRIMARY",
    //   setIdentifier: "blog-Primary",
    // })

    //TODO : fix ALB path to only /wp-json so WP UI won't render.. (link error too due to db import)

    // --- custom resource
    const loadWordpressTaskDef = new ecs.FargateTaskDefinition(this, 'loadWordpressTaskDef', {
      memoryLimitMiB: 1024,
      cpu: 512
    });
    loadWordpressTaskDef.addContainer('loadWordpressContainer', {
      image: ecs.ContainerImage.fromRegistry('mysql:5.5'),
      entryPoint: ["/bin/bash", "-c", "apt-get update && apt-get install -y wget && wget https://woof.kopi.io/wordpress.sql \
      && perl -pi -e 's/http:\\/\\/cdkwo-wordp-18gj2uwix34xa-916813877.ap-southeast-1.elb.amazonaws.com/https:\\/\\/$WORDPRESS_DOMAINNAME/g' wordpress.sql \
      && mysql -u $WORDPRESS_DB_USER --password=$WORDPRESS_DB_PASSWORD -h $WORDPRESS_DB_HOST < wordpress.sql"],
      memoryLimitMiB: 1024,
      secrets: {
        'WORDPRESS_DB_PASSWORD': ecs.Secret.fromSecretsManager(secret)
      },
      environment: {
        'WORDPRESS_DB_USER': 'root',
        'WORDPRESS_DOMAINNAME': props.hostedZoneName,
        'WORDPRESS_DB_HOST': dbcluster.clusterEndpoint.hostname,
        'WORDPRESS_DB_NAME': 'wordpress'
      },
      logging: new ecs.AwsLogDriver({ streamPrefix: "wordpress-load" })
    })


    const loadWordpressDB = new AwsCustomResource(this, "loadWordpressDb", {
      policyStatements: [ // Cannot use automatic policy statements because we need iam:PassRole, https://github.com/aws/aws-cdk/blob/master/packages/@aws-cdk/aws-events-targets/lib/ecs-task.ts
        new iam.PolicyStatement({
          actions: ["iam:PassRole"],
          // resources: [loadWordpressTaskDef.executionRole!.roleArn, loadWordpressTaskDef.taskRole.roleArn] //for Fargate need both
          resources: [loadWordpressTaskDef.obtainExecutionRole().roleArn, loadWordpressTaskDef.taskRole.roleArn]
        }),
        new iam.PolicyStatement({
          actions: ["ecs:RunTask"],
          resources: [loadWordpressTaskDef.taskDefinitionArn]
        })
      ],
      onCreate: {
        service: 'ECS',
        action: 'runTask',
        parameters: {
          taskDefinition: loadWordpressTaskDef.taskDefinitionArn,
          cluster: cluster.clusterArn,
          count: 1,
          launchType: 'FARGATE',
          networkConfiguration: {
            awsvpcConfiguration: {
              subnets: vpc.privateSubnets.map(privateSubnet => privateSubnet.subnetId),
              assignPublicIp: 'DISABLED',
            }
          }
        },
        physicalResourceId: Date.now().toString()
      }
    })
    loadWordpressDB.node.addDependency(dbcluster) // can only load wordpress DB when dbcluster is created., only do this for Primary Region

    // cdk/cfn output
    new cdk.CfnOutput(this, 'Primary Region VpcId_' + props.region, { value: vpc.vpcId });
    new cdk.CfnOutput(this, 'Primary Region private subnet for Elasticache (bookstoreSubnet1)', { value: vpc.selectSubnets({ subnetType: SubnetType.PRIVATE }).subnetIds[0] });
    //new cdk.CfnOutput(this, 'Wildcard_ACM_ARN_' + props.region, { value: validatedWildCardCert.certificateArn });
    new cdk.CfnOutput(this, 'Cloudfront_ACM_ARN_useast1', { value: validatedCloudFrontCert.certificateArn });
    new cdk.CfnOutput(this, 'RDS replication-source-identifier', { value: `arn:aws:rds:${this.region}:${this.account}:cluster:${dbcluster.clusterIdentifier}` });
  }
}
