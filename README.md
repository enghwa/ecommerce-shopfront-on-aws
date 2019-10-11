# Module: Build a Multi-Region Serverless Application for Resilience and High Availability

In this workshop you will use various AWS Services to build your own BookStore web application 
with multi-region active-active architecture. The front app (bookstore) is built on-top of 
AWS Bookstore Demo App (https://github.com/aws-samples/aws-bookstore-demo-app). 

You Bookstore on multi-region active-active architecture meets the following requirements:

1. Users must be able to read the book blog posts. 
2. Users must be able to look at the best sellers, purchase the books, manage your cart, checkout, and view your orders. 
3. The application should have morden Web and App architecture and highly available polygot persistance. 
4. The application must be able to failover to another region in the case of a disaster. The **RTO** and **RPO** must both be less than 15 minutes.
    * **RTO:** Recovery time objective – the targeted duration of time and a service
    level within which a business process must be restored after a disaster.
    * **RPO:** Recovery point objective –  the maximum targeted period in which data
    might be lost from a service due to a major incident.

## Architecture Overview

The application will utilize four layers:

1. A UI layer built using HTML, Javascript and CSS and hosted directly from AWS S3
2. An API layer built using Node.js running on AWS Lambda and exposed via Amazon API Gateway.
3. A data layer storing book and order information in DynamoDB.
4. An Wordpress layer for the book blog posts.

![Architecture diagram](images/architecture_diagram.png)

For the purposes of this workshop, our failover is focused on the path from
our application (in this case, a web application) through API Gateway,
Lambda and DynamoDB.  

The backend components will be replicated to the second region so that we can
failover in the event of a disaster. All data in DynamoDB, S3, Aurora MySQL will be
replicated from the primary region to the secondary region ensuring that our
application data will be available when we failover.

**Application components**

* Serverless service backend – Amazon API Gateway powers the interface layer between the frontend and backend, and invokes serverless compute with AWS Lambda.  
* Web application blueprint – We include a React web application pre-integrated out-of-the-box with tools such as React Bootstrap, Redux, React Router, internationalization, and more.
* Authentication - Cognito to allow the application to authenticate users and authorize access to
the API layer.

**Database components**

* Product catalog/shopping cart - Amazon DynamoDB offers fast, predictable performance for the key-value lookups needed in the product catalog, as well as the shopping cart and order history.  In this implementation, we have unique identifiers, titles, descriptions, quantities, locations, and price.
* Top sellers list - Amazon ElastiCache for Redis reads order information from Amazon DynamoDB Streams, creating a leaderboard of the “Top 20” purchased or rated books.
* Blog - (***Update**)

**Infrastructure components**

* Continuous deployment code pipeline – AWS CodePipeline and AWS CodeBuild help you build, test, and release your application code. 
* Serverless web application – Amazon CloudFront and Amazon S3 provide a globally-distributed application. 
* Health check and routing - AWS Route53 be used for DNS and will allow us to perform
health checks on our primary region, and upon detecting an issue,
automatically switching to our secondary region using Route53 DNS updates.
* ACM, Cloud9 (***Update**)

## Implementation Instructions

This workshop is broken up into multiple modules. In each, we will walk
through a high level overview of how to implement or test a part of this
architecture. You will expand sections for detailed command or console instructions.

### Region Selection (***Update**)

You can chosse the primary and secondary region with the following two regions for this workshop. 
Please remember these and check before creating resources to ensure you are in the correct region:
* Region 1: `eu-west-1` (Ireland)
* Region 2: `ap-southeast-1` (Singapore)

### Modules 
0. [Prepare prerequisites](0_Prerequisities/README.md)
1. [Build a bookstore on Primary region](1_PrimaryRegion/README.md)
2. [Build a bookstore on Secondary region](2_SecondaryRegion/README.md)
3. [Configure Routing](3_Route53Configuration/README.md)
4. [Test failover](4_TestingFailover/README.md)
5. [Cleaning Up](5_Cleanup/README.md)

### Important Note

In order to conduct this workshop you need an AWS Account with access to
create AWS IAM, S3, DynamoDB, Lambda and API Gateway. The code and
instructions in this workshop assume only one student is using a given AWS
account at a time. If you try sharing an account with another student, you'll
run into naming conflicts for certain resources - we do not recommend this as
there may be unpredictable results or difficult to identify configuration issues.
If your laptop's security policy blocks any 3rd party cookies (required by Cloud9), pair up with someone else who has a laptop which is not blocked.
Please use only Chrome or Firefox browsers.

### Let's start!

To start the workshop you need the AWS Command Line Interface
(CLI). The front end application is written on Amplify and requires node and npm. To avoid spending time on configuring your laptop, we will use [AWS Cloud9](https://aws.amazon.com/cloud9/) as our IDE. It has AWS CLI preconfigured.

Follow the instruction [here to launch a AWS Cloud9 IDE](0_Prerequisites/README.md) before we start the lab.

================================================

# Backup

### Modules 
0. Create AWS Cloud9 Environment
1. Build a Primary region Bookstore: CDK / CFN
2. Build multi-region solution: Aurora, S3, DynamoDB
3. Build a Seconary region Bookstore: CDK / CFN
4. Congifure Active-Active: Route53, ACM, DNS Health Check
5. Test failover
6. Cleaning Up

### 1. Primary region - CDK
VPC, Subnet, Security group, routetable (refer to cfn)
ALB, Fargate, Aurora (with custom parameter group, cluster, writer, read)
2nd region VPC, Subnet, Security group, routetable (refer to cfn) 

-> It takes 20mins. Execute this one then presentation? output aurora arn

### 1. Primary region - CFN
Remove metadata, neptune, search (dependson), apigateway (auth:none 3 item, book, bestselleors), s3 (version enable)
input param (vpc cdk#1)
route53 hostzone -> call remote api do nsrecord xyz (random number acm) -> origincal acm region1/2 (auto approval)

### 1. Update blog URL and Cloudfront 
content is in the cdk readme

### 2. Build multi-region solution - Aurora cross-region read replica(2nd region)
in Cloud9, --region

aws rds create-db-cluster \
  --db-cluster-identifier <sample-replica-cluster> \
  --engine aurora \
  --replication-source-identifier <source aurora arn> \
  --region <region2>

aws rds describe-db-clusters --db-cluster-identifier sample-replica-cluster

aws rds create-db-instance \
  --db-instance-identifier test-instance
  --db-cluster-identifier <sample-replica-cluster> \
  --db-instance-class <db.t3.small> \
  --engine aurora \
  --region <region2>

The endpoint should be updated in the fargate

### 2. Build multi-region solution - S3
aws s3api create-bucket \
--bucket <AssetsBucketName-region2> \
--region <us-west-2> \
--create-bucket-configuration LocationConstraint=<us-west-2>

aws s3api put-bucket-versioning \
--bucket <AssetsBucketName-region2> \
--versioning-configuration Status=Enabled

<!-- aws s3 website s3://<AssetsBucketName-region2>/ --index-document index.html -->

<!-- $ aws iam create-role \
--role-name crrRole \
--assume-role-policy-document file://s3-role-trust-policy.json 

$ aws iam put-role-policy \
--role-name crrRole \
--policy-document file://s3-role-permissions-policy.json \
--policy-name crrRolePolicy \ -->

{
  "Role": "<IAM-role-ARN>",
  "Rules": [
    {
      "Status": "Enabled",
      "Priority": 1,
      "DeleteMarkerReplication": { "Status": "Disabled" },
      "Filter" : { "Prefix": ""},
      "Destination": {
        "Bucket": "arn:aws:s3:::<bucketname-region2>"
      }
    }
  ]
}

$ aws s3api put-bucket-replication \
--replication-configuration file://replication.json \
--bucket <source>

https://docs.aws.amazon.com/AmazonS3/latest/dev/crr-walkthrough1.html

### 2. Build multi-region solution - DynamoDB (Q. it's complated cli than console. one with cli, two with ui)
aws dynamodb create-table \
    --table-name teres-Cart \
    --attribute-definitions \
        AttributeName=customerId,AttributeType=S \
        AttributeName=bookId,AttributeType=S \
    --key-schema \
        AttributeName=customerId,KeyType=HASH \
        AttributeName=bookId,KeyType=RANGE \
    --provisioned-throughput \
        ReadCapacityUnits=1,WriteCapacityUnits=1 \
    --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
    --region eu-central-1

aws dynamodb create-global-table \
    --global-table-name teres-Cart \
    --replication-group RegionName=us-west-2 RegionName=eu-central-1 \
    --region us-west-2

### 3. Secondary region - CDK
ACM, Route53 Domain Name and the DNS
ALB, fargate, input param (VPC cdk#1, aurora read endpoint of #2)

### 3. Secondary region - CFN
cognito, apigateway, lambda, cache 
input param (vpc cdk#1, s3 #2, dynamodb #2)
cli - lambada trigger UpdateBestSellers

aws lambda create-event-source-mapping --function-name teres-UpdateBestSellers --batch-size 1 --starting-position LATEST \
--event-source-arn arn:aws:dynamodb:eu-central-1:376715876263:table/teres-Orders/stream/2019-10-08T17:06:59.789

cli - origin group

### 5. Failover
1. Delete Fargate Service
2. API gateway: books get disable
3. Delete (aurora, dynamdb) - video 

Low priority: Cloudfront s3 origin group

how to automate route53 registation
we need to acm auto approval

### Todo
1. second region cdk
2. acm health check
3. Global accelerator




