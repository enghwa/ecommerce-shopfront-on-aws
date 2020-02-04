import cdk = require('@aws-cdk/core');
import route53 = require('@aws-cdk/aws-route53');
import { AwsCustomResource } from "@aws-cdk/custom-resources";
import iam = require('@aws-cdk/aws-iam');
import lambda = require('@aws-cdk/aws-lambda');

// 1. create hosted zone 
// 2. activate hosted zone by submitting to master  DNS using lambda function

export class createHostedZoneStack extends cdk.Stack {
  public hostedZoneID: string
  public hostedZoneName: string

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const zoneNameShort = process.env.MYSUBDOMAIN || "error18";
    const zoneName = zoneNameShort + ".multi-region.xyz";

    const myHostedZone = new route53.HostedZone(this, "myHostedZone", {
      zoneName
    })

    const nameServers = myHostedZone.hostedZoneNameServers || [];
    this.hostedZoneID = myHostedZone.hostedZoneId
    this.hostedZoneName = zoneName

    const requestJoinMasterDomain = new lambda.Function(this, "requestJoinMasterDomain", {
      functionName: "requestJoinMasterDomain",
      runtime: lambda.Runtime.NODEJS_10_X,
      code: lambda.Code.asset('lambda/submit.zip'),
      handler: "submit.handler",
      timeout: cdk.Duration.seconds(10)
    })

    const updateParentHostedZone = new AwsCustomResource(this, "setupHostedZone", {
      policyStatements: [
        new iam.PolicyStatement({
          actions: ["lambda:InvokeFunction"],
          resources: ["*"]
        })
      ],
      onCreate: {
        service: 'Lambda',
        action: 'invoke',
        parameters: {
          FunctionName: 'requestJoinMasterDomain',
          InvocationType: "RequestResponse",
          Payload: '{"ns": "' + cdk.Fn.join(", ", nameServers) + '", "sds": "' + zoneNameShort + '"}',
        },
        physicalResourceId: "requestJoinMasterDomain_" + zoneNameShort // Date.now().toString()
      }
    })
    updateParentHostedZone.node.addDependency(myHostedZone)
    updateParentHostedZone.node.addDependency(requestJoinMasterDomain)

    new cdk.CfnOutput(this, 'hostedZoneName', { description: "export hostedZoneName="+zoneName, value: zoneName });
    new cdk.CfnOutput(this, 'hostedZoneID', { description: "export hostedZoneID=", value: myHostedZone.hostedZoneId });
    new cdk.CfnOutput(this, "NameServers", {
      description: "NameServers for " + zoneName,
      value: cdk.Fn.join(", ", nameServers)
    });
  }
}