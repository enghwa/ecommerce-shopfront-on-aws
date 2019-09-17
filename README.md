# MultiRegion-Modern-Architecture

The application will utilize three layers:

1. 
2. 
3. 

![Architecture diagram](images/architecture_diagram.png)

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

### 1. Primary region - CFN
Remove metadata, neptune, search (dependson), apigateway (auth:none 3 item, book, bestselleors), s3 (version enable)
input param (vpc cdk#1)

### 2. Build multi-region solution - Aurora (2nd region)
aws rds create-db-cluster \
  --db-cluster-identifier sample-replica-cluster \
  --engine aurora \
  --replication-source-identifier <source aurora arn> \

aws rds create-db-instance \
  --db-cluster-identifier <sample-replica-cluster> \
  --db-instance-class <db.r3.large> \
  --engine aurora

### 2. Build multi-region solution - S3
aws s3api create-bucket \
--bucket <AssetsBucketName-region2> \
--acl private \ 
--region <us-west-2> \

aws s3api put-bucket-versioning \
--bucket <AssetsBucketName-region2> \
--versioning-configuration Status=Enabled \

aws s3 website s3://<AssetsBucketName-region2>/ --index-document index.html

$ aws iam create-role \
--role-name crrRole \
--assume-role-policy-document file://s3-role-trust-policy.json 

$ aws iam put-role-policy \
--role-name crrRole \
--policy-document file://s3-role-permissions-policy.json \
--policy-name crrRolePolicy \

$ aws s3api put-bucket-replication \
--replication-configuration file://replication.json \
--bucket source

https://docs.aws.amazon.com/AmazonS3/latest/dev/crr-walkthrough1.html

### 2. Build multi-region solution - DynamoDB
aws dynamodb create-global-table \
--global-table-name <Books, Orders, Cart> \
--replication-group RegionName=<eu-west-1> RegionName=<ap-southeast-1> \
--region <eu-west-1>

### 3. Secondary region - CDK
ALB, fargate, input param (VPC cdk#1, aurora read endpoint of #2)

### 3. Secondary region - CFN
cognito, apigateway, lambda, cache 
input param (vpc cdk#1, s3 #2, dynamodb #2)

### 5. Failover
1. Delete Fargate Service
2. API gateway: books get disable
3. Delete (aurora, dynamdb) - video 

Low priority: Cloudfront s3 origin group