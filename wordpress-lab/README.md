# Lab 

in the Cloud9
#git clone https://github.com/enghwa/MultiRegion-Modern-Architecture.git
using user github id/pwd

make sure you are in `wordpress-lab` directory:

deploy wordpress on fargate, ALB, vpc, ACM, aurora-primary in Primary Region.

```bash
//nvm ....
//need to export AWS_DEFAULT_REGION = "primary region" , eg: `eu-west-1`, 

export AWS_DEFAULT_REGION=eu-west-1
export MYSUBDOMAIN=<enter a 8 char subdomain name, eg: team5432>
cd MultiRegion-Modern-Architecture/wordpress-lab
npm install
npx cdk@1.12.0 bootstrap
npx cdk@1.12.0 deploy hostedZone
npx cdk@1.12.0 deploy Wordpress-Primary
```

_Validate blog_
curl http://blog.<MYSUBDOMAIN>.multi-region.xyz/wp-json/wp/v2/posts
curl http://primary.blog.<MYSUBDOMAIN>.multi-region.xyz/wp-json/wp/v2/posts


_Create Secondary Region resources_

go to CF output to find the value of your hostedZoneID: 

https://eu-west-1.console.aws.amazon.com/cloudformation/home?region=eu-west-1#/stacks/outputs?filteringText=&filteringStatus=active&viewNested=true&hideStacks=true&stackId=arn%3Aaws%3Acloudformation%3Aeu-west-1%3A203083063306%3Astack%2FhostedZone%2F54a25e00-ee67-11e9-b59f-02078729aa3e

```bash
export hostedZoneID=<route53 hosted zone ID of MYSUBDOMAIN.multi-region.xyz>
export hostedZoneName=$MYSUBDOMAIN.multi-region.xyz
export AWS_DEFAULT_REGION=ap-southeast-1
npx cdk@1.12.0 deploy Wordpress-Secondary

```

```
Do you wish to deploy these changes (y/n)? -> both "npx cdk deploy" asked this question.
```
Type "Y".
this will take 20 min.

### Validate your domain name

```
dig +short NS $MYSUBDOMAIN.multi-region.xyz

```

Expected output: a list of 4 NS servers. Yours will not be the same as below but as long as there are 4, it means your Route53 has authority to the subdomain `$MYSUBDOMAIN.multi-region.xyz`.

```
ns-1202.awsdns-22.org.
ns-1868.awsdns-41.co.uk.
ns-330.awsdns-41.com.
ns-889.awsdns-47.net.
```

Need to write down the vpc id and cidr (cidr should be output too)

## deploy serverless app stack (after 1st cfn) -> It should be moved to after 1st cfn instruction.

//draft notes.. need screnshots!
check CodePipeline that the web asset is fully deployed.

check your cloudfront url from the cfn output -> you should see book listing, but there is no blog articles yet.

## update Blog url to the webasset and it will kick off another codepipeline

Find your code repo in codecommit and edit: (screenshot) under src/
`wordpressconfig.ts`.
Update:
`https://blog.<your subdomain name>.multi-region.xyz`

eg:
assume my `MYSUBDOMAIN` i set previously was `team5432`,
```javascript
export default {

  wordpress: {
    WPURL: "https://blog.team5432.multi-region.xyz/"
  }
}
```
author and email. -> commit changes 
you can check the build process in codepipeline.
once codepipeline fully build again, blog should show up at cloudfront url.

next:
## update Cloudfront to your domain name instead of `https://?????????????.cloudfront.net`:

an ACM cert is already created for CloudFront in your region.

Update Cloudfront CNAME to `$MYSUBDOMAIN.multi-region.xyz` (screenshot)
in Cloudfront, general tab - Alternate Domain Names (CNAMEs) and SSL Certificate

in Route53, create an apex record:
Alias 'Yes', Type `A` and point it to the cloudfront domain name, `?????????????.cloudfront.net`. (screenshot)


## make Secondary Region Wordpress work
make sure rds replication is setup properly in Singapore Region..
get the READ endpoint of the RDS Cluster in Singapore

// below need a few screenshots to show


1. update AWS Secret Manager in Singapore:
go to Primary Region -> AWS Secretmanager -> wordpressDBPassword-> Retrieve secret value -> Copy the value
go to Secondary Region (Singapore) -> AWS Secretmanager -> wordpressDBPassword-> Retrieve secret value -> Edit and update it to the value from Primary Region

2. update ECS task

1. Go Secondary Region (Singapore) -> ECS TASK DEF -> WordpressSecondarywordpresssvcTaskDe??? -> click on the task def -> click "Create new revision -> scroll down-> click "web" ->side menu pops up -> update "WORDPRESS_DB_HOST" -> change from "changme" to the RDS endpoint -> click "update" button
2. update ECS Service to this new task definition



##Clean up

Do this in order:

delete the S3 asset bucket, codepipeline bucket

Using AWS Console:
 * Promote RDS Cluster then delete RDS instance in ap-southeast-1
 * delete CFN stack in both regions
 * delete recordsets (except NS and SOA ) in Route 53 


//maybe easier to use cfn console to delete these stacks created by CDK.. :P
In AWS Cloud9:

```bash
export AWS_DEFAULT_REGION=ap-southeast-1
npx cdk@1.12.0 destroy Wordpress-Primary


export AWS_DEFAULT_REGION=eu-west-1
npx cdk@1.12.0 destroy Wordpress-Primary
npx cdk@1.12.0 destroy hostedZone
```

Using AWS Console:
* manually delete all the ACM certs in ap-southeast-1 and eu-west-1



<!-- 
# Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
 --require-approval never -->