#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { WordpressLabStack } from '../lib/wordpress-lab-stack';
import { createHostedZoneStack } from '../lib/createHostedZone';


const app = new cdk.App();

// create and activate student hosted zone
const  myhostedZone = new createHostedZoneStack(app, "hostedZone");

new WordpressLabStack(app, 'Wordpress-Primary', {
  hostedZoneID: myhostedZone.hostedZoneID,
  hostedZoneName: myhostedZone.hostedZoneName,
  region: 'us-west-2'
});

//get hostedZone
// new createHostedZoneStack(app, "hostedZone", {
//   env: {
//     account: process.env.CDK_DEFAULT_ACCOUNT,
//     region: process.env.CDK_DEFAULT_REGION
//   }
// });


// new DemoStack(app, "demodemo", {
//   env: {
//     region: process.env.CDK_DEFAULT_REGION,
//     account: process.env.CDK_DEFAULT_ACCOUNT
//   }
// })