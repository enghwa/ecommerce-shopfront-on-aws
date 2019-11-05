import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import ecs_patterns = require('@aws-cdk/aws-ecs-patterns');
import elbv2 = require("@aws-cdk/aws-elasticloadbalancingv2");
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
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, "hostedZone", {
      hostedZoneId: HZID,
      zoneName: myDomainName
    })

    //for api gw
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
    const validatedBlogWildCardCert = new acm.DnsValidatedCertificate(this, 'validatedBlogWildCardCert', {
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

    // we need RDS DB subnet group and security group, so we can create the secondary region RDS replication
    const dbSubnetGroup: rds.CfnDBSubnetGroup = new rds.CfnDBSubnetGroup(this, 'DB-SubnetGrp', {
      dbSubnetGroupDescription: 'Subnet group to access RDS',
      dbSubnetGroupName: 'SecondaryRegion-WordpressDB-subnetgroup',
      subnetIds: vpc.selectSubnets({ subnetType: SubnetType.PRIVATE }).subnetIds
    });

    const dbsecuritygroup = new ec2.SecurityGroup(this, 'wordpress-dbsg', {
      vpc: vpc,
      description: "wordpress database security group",
      securityGroupName: "wordpressDB-SG"
    })
    dbsecuritygroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(3306), "Allow inbound to db")

    // wordpress ECS
    const wordpressSvc = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'wordpress-svc', {
      cluster: cluster,
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry('wordpress:5.2.3-php7.2-apache'),
        containerPort: 80,
        secrets: {
          'WORDPRESS_DB_PASSWORD': ecs.Secret.fromSecretsManager(secret)
        },
        environment: {
          'WORDPRESS_DB_USER': 'root',
          'WORDPRESS_DB_HOST': 'changeme',
          'WORDPRESS_DB_NAME': 'wordpress',
        },
      },
      desiredCount: 1,
      cpu: 512,
      memoryLimitMiB: 1024,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      domainName: "secondary.blog." + myDomainName,
      domainZone: hostedZone,
      // certificate: Certificate.fromCertificateArn(this, 'alb-sslcert', validatedBlogWildCardCert.certificateArn)
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

    wordpressSvc.listener.addCertificateArns('blogACM', [validatedBlogCert.certificateArn, validatedBlogWildCardCert.certificateArn])
    //add secondary failover alias
    new route53.CfnRecordSet(this, 'blog-alias-secondary', {
      name: "blog." + myDomainName + ".",
      type: route53.RecordType.A,
      hostedZoneId: props.hostedZoneID,
      aliasTarget: {
        dnsName: "secondary.blog." + myDomainName + ".",
        evaluateTargetHealth: true,
        hostedZoneId: props.hostedZoneID
      },
      failover: "SECONDARY",
      setIdentifier: "blog-Secondary",
    })

    new route53.CfnRecordSet(this, 'blog-alias-primary', {
      name: "blog." + myDomainName + ".",
      type: route53.RecordType.A,
      hostedZoneId: props.hostedZoneID,
      aliasTarget: {
        dnsName: "primary.blog." + myDomainName + ".",
        evaluateTargetHealth: true,
        hostedZoneId: props.hostedZoneID
      },
      failover: "PRIMARY",
      setIdentifier: "blog-Primary",
    })

    // cdk/cfn output
    new cdk.CfnOutput(this, 'Secondary Region VpcId_' + props.region, { value: vpc.vpcId });
    new cdk.CfnOutput(this, 'Secondary Region private subnet for Elasticache', { value: vpc.selectSubnets({ subnetType: SubnetType.PRIVATE }).subnetIds[0] });
    new cdk.CfnOutput(this, 'Wildcard_ACM_ARN_' + props.region, { value: validatedWildCardCert.certificateArn });
    new cdk.CfnOutput(this, 'WordpressDB SubnetGroup Name', { value: dbSubnetGroup.dbSubnetGroupName!.toLowerCase() || "" });
    new cdk.CfnOutput(this, 'WordpressDB securityGroup Id', { value: dbsecuritygroup.securityGroupName });
  }
} 
