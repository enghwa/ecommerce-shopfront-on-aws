# Lab 

in the Cloud9
#git clone https://github.com/enghwa/MultiRegion-Modern-Architecture.git
using user github id/pwd

make sure you are in `wordpress-lab` directory:

deploy wordpress on fargate, ALB, vpc, ACM, aurora-primary in Primary Region.

```bash
//nvm ....
//need to export AWS_DEFAULT_REGION = "primary region" , eg: `us-west-2`, 

export AWS_DEFAULT_REGION=us-west-2
export MYSUBDOMAIN=<enter a 8 char subdomain name, eg: team5432>
npm install
npx cdk bootstrap
npx cdk@1.8.0 deploy hostedZone
npx cdk@1.8.0 deploy Wordpress-Primary

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


<!-- 
# Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
 --require-approval never -->