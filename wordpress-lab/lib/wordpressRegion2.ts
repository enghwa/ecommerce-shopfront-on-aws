import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import ecs_patterns = require('@aws-cdk/aws-ecs-patterns');
import secretsmanager = require('@aws-cdk/aws-secretsmanager');
import { Certificate } from '@aws-cdk/aws-certificatemanager';
import route53 = require('@aws-cdk/aws-route53');
import acm = require('@aws-cdk/aws-certificatemanager');
import iam = require('@aws-cdk/aws-iam');
import cdk = require('@aws-cdk/core');
import { SubnetType } from '@aws-cdk/aws-ec2';
import rds = require('@aws-cdk/aws-rds');


export interface WordpressLabProps extends cdk.StackProps {
  hostedZoneID: string,
  hostedZoneName: string,
  region: string
}

export class wordpressRegion2 extends cdk.Stack {

  constructor(scope: cdk.Construct, id: string, props: WordpressLabProps) {
    super(scope, id);

    const vpc = new ec2.Vpc(this, 'VPC-ARC309-Region2', {
      maxAzs: 2,
      natGateways: 1,
      cidr: '172.31.0.0/16'
    });

    //ACM and DNS
    const myDomainName = props.hostedZoneName //process.env.MYSUBDOMAIN + ".multi-region.xyz";
    const HZID = props.hostedZoneID //process.env.HOSTEDZONE as string ;
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, "hostedZone",{
      hostedZoneId: HZID,
      zoneName: myDomainName
    })


    const validatedWildCardCert = new acm.DnsValidatedCertificate(this, 'validatedWildCardCertificate', {
      hostedZone,
      domainName: `*.${myDomainName}`,
      region: props.region
    });
    const validatedBlogCert = new acm.DnsValidatedCertificate(this, 'validatedBlogCertificate', {
      hostedZone,
      domainName: `blogr2.${myDomainName}`,
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

    // const dbsecuritygroup = new ec2.SecurityGroup(this, 'wordpress-dbsg', {
    //   vpc: vpc,
    //   description: "wordpress database security group"
    // })
    // dbsecuritygroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(3306), "Allow inbound to db")

    // const dbClusterParam = new rds.ClusterParameterGroup(this, 'replica-param-aurora', {
    //   family: 'aurora5.6',
    //   description: 'Aurora 5.6 DB Cluster Parameter - reinvent 2019',
    //   parameters: {
    //     binlog_format: 'MIXED'
    //   }
    // });

    // const dbcluster = new rds.DatabaseCluster(this, 'wordpress-db-cluster', {
    //   engine: rds.DatabaseClusterEngine.AURORA,
    //   removalPolicy: cdk.RemovalPolicy.DESTROY,
    //   masterUser: {
    //     username: 'root',
    //     password: secret.secretValue
    //   },
    //   parameterGroup: dbClusterParam,
    //   defaultDatabaseName: 'wordpress',
    //   instanceProps: {
    //     instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.SMALL),
    //     securityGroup: dbsecuritygroup,
    //     vpcSubnets: {
    //       subnetType: ec2.SubnetType.PRIVATE,
    //     },
    //     vpc
    //   }
    // })

    const dbSubnetGroup: rds.CfnDBSubnetGroup = new rds.CfnDBSubnetGroup(this, 'DB-SubnetGrp', {
      dbSubnetGroupDescription: 'Subnet group to access RDS',
      dbSubnetGroupName: 'SecondaryRegion-WordpressDB-subnetgroup',
      subnetIds: vpc.selectSubnets({subnetType: SubnetType.PRIVATE}).subnetIds
    });


    const wordpressSvc = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'wordpress-svc', {
      cluster: cluster,
      image: ecs.ContainerImage.fromRegistry('wordpress:5.2.3-php7.2-apache'),
      containerPort: 80,
      desiredCount: 1,
      cpu: 512,
      memoryLimitMiB: 1024,
      secrets: {
        'WORDPRESS_DB_PASSWORD': ecs.Secret.fromSecretsManager(secret)
      },
      environment: {
        'WORDPRESS_DB_USER': 'root',
        'WORDPRESS_DB_HOST': 'changeme',
        'WORDPRESS_DB_NAME': 'wordpress',
      },
      domainName: "blogr2." + myDomainName,
      domainZone: hostedZone,
      certificate: Certificate.fromCertificateArn(this, 'alb-sslcert', validatedBlogCert.certificateArn)
    })

    wordpressSvc.targetGroup.configureHealthCheck({
      port: 'traffic-port',
      path: '/',
      interval: cdk.Duration.seconds(5),
      timeout: cdk.Duration.seconds(4),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 2,
      healthyHttpCodes: "200,301,302"
    })

    //TODO : fix ALB path to only /wp-json so WP UI won't render.. (link error too due to db import)

    
    // cdk/cfn output
    new cdk.CfnOutput(this, 'Secondary Region VpcId_'+ props.region , { value: vpc.vpcId });
    new cdk.CfnOutput(this, 'Secondary Region private subnet for Elasticache', { value: vpc.selectSubnets({subnetType: SubnetType.PRIVATE}).subnetIds[0] });
    new cdk.CfnOutput(this, 'Wildcard_ACM_ARN_'+ props.region , { value: validatedWildCardCert.certificateArn });
    new cdk.CfnOutput(this, 'WordpressDB SubnetGroup Name' , { value: dbSubnetGroup.dbSubnetGroupName || ""});
    
  }
} 
