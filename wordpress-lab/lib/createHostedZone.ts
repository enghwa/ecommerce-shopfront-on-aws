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

    let randomSubDomain ="lab" + getRandomSubDomain().toString()
    const zoneNameShort = process.env.MYSUBDOMAIN || "error18" ; //randomSubDomain; // "firefox8"; //should get from process.env. || genenerate one?
    const zoneName = zoneNameShort + ".multi-region.xyz";

    const myHostedZone = new route53.HostedZone(this, "myHostedZone", {
      zoneName
    })

    const nameServers = myHostedZone.hostedZoneNameServers || [];
    this.hostedZoneID = myHostedZone.hostedZoneId
    this.hostedZoneName = zoneName

    const requestJoinMasterDomain = new lambda.Function(this, "requestJoinMasterDomain", {
      functionName: "requestJoinMasterDomain",
      runtime: lambda.Runtime.NODEJS_8_10,
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
        physicalResourceId: Date.now().toString()
      }
    })
    updateParentHostedZone.node.addDependency(myHostedZone)
    updateParentHostedZone.node.addDependency(requestJoinMasterDomain)

    new cdk.CfnOutput(this, 'zoneName', { value: zoneName });
    new cdk.CfnOutput(this, 'hohostedZoneIds', { value: myHostedZone.hostedZoneId });
    new cdk.CfnOutput(this, "NameServers", {
      description: "NameServers for " + zoneName,
      value: cdk.Fn.join(", ", nameServers)
    });
  }
}


// random

function sfc32(a: number, b: number, c: number, d: number) {
  return function () {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    var t = (a + b) | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = (c << 21 | c >>> 11);
    d = d + 1 | 0;
    t = t + d | 0;
    c = c + t | 0;
    return (t >>> 0) / 4294967296;
  }
}
function xmur3(str: string) {
  for (var i = 0, h = 1779033703 ^ str.length; i < str.length; i++)
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353),
      h = h << 13 | h >>> 19;
  return function () {
    h = Math.imul(h ^ h >>> 16, 2246822507);
    h = Math.imul(h ^ h >>> 13, 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }
}
function getRandomSubDomain() {
  // Create xmur3 state:
  let seed = xmur3(process.env.C9_HOSTNAME || "theQuiCkBr0wnFox"); //for AWS Cloud9 use only..cannot be random every seconds else  cdk will keep changing subdomain

  // Output four 32-bit hashes to provide the seed for sfc32.
  // let rand = sfc32(seed(), seed(), seed(), seed());

  // Output one 32-bit hash to provide the seed for mulberry32.
  let rand = mulberry32(seed());

  return Math.floor(rand() * 1000)
}

function mulberry32(a: number) {
  return function () {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}
