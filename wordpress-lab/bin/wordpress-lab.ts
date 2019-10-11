#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { WordpressLabStack } from '../lib/wordpress-lab-stack';
import { createHostedZoneStack } from '../lib/createHostedZone';
import { wordpressRegion2 } from '../lib/wordpressRegion2';


const app = new cdk.App();

//check for process.env.MYSUBDOMAIN ?
if (!process.env.MYSUBDOMAIN) {
  console.error("please define MYSUBDOMAIN!! \nRUN: \n")
  console.error('\x1b[32m%s\x1b[33m%s\x1b[0m', "export MYSUBDOMAIN=", "<enter an unique 8-character  subdomain name for yourself, eg: team5432> \n")
  console.error("We will then automatically register team5432.multi-region.xyz for you.")
  process.exit(1)
}

// const envEU  = {region: 'eu-west-1' };
const envEU  = {region: 'us-west-2' };
const envAP = {region: 'ap-southeast-1' };

// create and activate student hosted zone
const myhostedZone = new createHostedZoneStack(app, "hostedZone");



const x= new WordpressLabStack(app, 'Wordpress-Primary', {
  hostedZoneID: myhostedZone.hostedZoneID,
  hostedZoneName: myhostedZone.hostedZoneName,
  region: process.env.AWS_DEFAULT_REGION || 'eu-west-1',
});

new wordpressRegion2(app, 'Wordpress-Secondary', {
  hostedZoneID: process.env.hostedZoneID || '',
  hostedZoneName: process.env.hostedZoneName || '',
  region: process.env.AWS_DEFAULT_REGION || 'ap-southeast-1',
  env: envAP
})

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