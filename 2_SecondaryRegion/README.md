# Building a second bookstore in the secondary region

We completed build the first bookstore in the primary region in the previous section. In this section, we will replicate S3 bucket for static contects, Aurora MySQL for the blog content, and DynamoDB tables for the books/order/cart data from the primary region to the secondary region.

#### Enable Aurora MySQL Read replica in Singapore region

This Aurora MySQL Read replica helps you have redundancy plan when you have issue in the primary database in the primary region. The replica in Singapore region can be promoted as the primary database. 

Follow the steps to enable the read replica of Aurora in Singapore region using the AWS CLI. 

```bash
aws rds create-db-cluster \
  --db-cluster-identifier <sample-replica-cluster> \
  --engine aurora \
  --replication-source-identifier <source aurora cluster arn> \
  --db-subnet-group-name <value> \
  --region <region2>

```
```bash
aws rds create-db-cluster \
  --db-cluster-identifier arc309-replica-cluster \
  --engine aurora \
  --replication-source-identifier arn:aws:rds:eu-west-1:376715876263:cluster:wordpress-primary-wordpressdbclusterbda8ec52-1tketnnhp1rq9 \
  --region ap-southeast-1
```
```bash
aws rds describe-db-clusters --db-cluster-identifier <sample-replica-cluster> --region <region2>
```
```bash
aws rds describe-db-clusters --db-cluster-identifier arc309-replica-cluster --region ap-southeast-1
```
```bash
aws rds create-db-instance \
  --db-instance-identifier <sample-instance> \ 
  --db-cluster-identifier <sample-replica-cluster> \
  --db-instance-class <db.t3.small> \
  --engine aurora \
  --region <region2>
```
```bash
  aws rds create-db-instance \
  --db-instance-identifier arc309-instance \
  --db-cluster-identifier arc309-replica-cluster \
  --db-instance-class db.t3.small \
  --engine aurora \
  --region ap-southeast-1
```
It takes for a while, you can procced the next step first.

### 2. Enable S3 replication

This S3 replication will replicate the statice contents from Irelad region to Singapore whenever there is update. 
Follow the steps to enable the S3 replication using the AWS CLI. 

aws s3api create-bucket \
--bucket <AssetsBucketName-region2> \
--region <region2> \
--create-bucket-configuration LocationConstraint=<region2>

aws s3api create-bucket \
--bucket bookjay-s3-region2 \
--region ap-southeast-1 \
--create-bucket-configuration LocationConstraint=ap-southeast-1

S3 replication requires the versioning.

aws s3api put-bucket-versioning \
--bucket <AssetsBucketName-region2> \
--versioning-configuration Status=Enabled

aws s3api put-bucket-versioning \
--bucket bookjay-s3-region2 \
--versioning-configuration Status=Enabled

<!-- aws s3 website s3://<AssetsBucketName-region2>/ --index-document index.html -->

<!-- $ aws iam create-role \
--role-name crrRole \
--assume-role-policy-document file://s3-role-trust-policy.json 

$ aws iam put-role-policy \
--role-name crrRole \
--policy-document file://s3-role-permissions-policy.json \
--policy-name crrRolePolicy \ -->

Add replication configuration to the source bucket in Ireland region. Save the following JSON in a file called replication.json to the local directory on your Cloud9. 

You need S3 replication role ARN for this exercise. You can find it in the output table of your CloudFormation stack in Ireland or execute following command in the Cloud9.

aws iam get-role --role-name <projectname-S3replicationRole>
aws iam get-role --role-name bookjay-S3replicationRole

ARN looks like arn:aws:iam::xxx:role/bookjay-S3replicationRole

To create 'replication.json' file in the Cloud9, 
$vi replication.json
esc+i: insert
copy and paste the following
esc+wq! save

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

$ aws s3api put-bucket-replication \
--replication-configuration file://replication.json \
--bucket bookjay-s3

FYI. Only the newly uploaded to the source bucket will be replicated to the destination bucket

### 3. Enable DynamoDB Global Table using Console

Follow the steps to create a global table of Book, Order, Cart form the Ireland to Singapore regions using the console. (screenshot)

Go to DynampDB Ireland
Select Books table - Global Tables tab - Add region - Select Singapore - Continue
Do the same things or Orders and Cart.
You can check there are two regions in the Global Table regions.

<!-- aws dynamodb create-table \
    --table-name <Books table name> \
    --attribute-definitions \
        AttributeName=id,AttributeType=S \
        AttributeName=category,AttributeType=S \
    --key-schema \
        AttributeName=id,KeyType=HASH \
    --provisioned-throughput \
        ReadCapacityUnits=1,WriteCapacityUnits=1 \
    --global-secondary-indexes IndexName=category-index,KeySchema=[{AttributeName=category,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=1,WriteCapacityUnits=1} \
    --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
    --region <region2>

aws dynamodb create-table \
    --table-name <Order table name> \
    --attribute-definitions \
        AttributeName=customerId,AttributeType=S \
        AttributeName=orderId,AttributeType=S \
    --key-schema \
        AttributeName=customerId,KeyType=HASH \
        AttributeName=orderId,KeyType=RANGE \
    --provisioned-throughput \
        ReadCapacityUnits=1,WriteCapacityUnits=1 \
    --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
    --region <region2>

aws dynamodb create-table \
    --table-name <Cart table name> \
    --attribute-definitions \
        AttributeName=customerId,AttributeType=S \
        AttributeName=bookId,AttributeType=S \
    --key-schema \
        AttributeName=customerId,KeyType=HASH \
        AttributeName=bookId,KeyType=RANGE \
    --provisioned-throughput \
        ReadCapacityUnits=1,WriteCapacityUnits=1 \
    --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
    --region <region2>

aws dynamodb create-global-table \
    --global-table-name <Book table name>  \
    --replication-group RegionName=<region1> RegionName=<region2> \
    --region <region2> -->

Now, you completed the replication across two regions. It's time to build the Web/App layer in Singapore. 

## CDK for the secondary region

Go to `wordpress-lab` directory (ex. /home/ec2-user/environment/MultiRegion-Modern-Architecture/wordpress-lab)

Deploy Wordpress for the Book blog with AWS Fargate, ALB, ACM, and Aurora MySQL in Primary Region.

```bash
//nvm ....
//need to export AWS_DEFAULT_REGION = "primary region" , eg: `eu-west-1`, 

export AWS_DEFAULT_REGION=eu-west-1
export MYSUBDOMAIN=<enter a 8 char subdomain name, eg: team5432>
npm install
npx cdk@1.8.0 bootstrap
npx cdk@1.8.0 deploy hostedZone
npx cdk@1.8.0 deploy Wordpress-Primary

```

```
Do you wish to deploy these changes (y/n)? -> both "npx cdk@1.8.0 deploy" commands asked this question.
```
Type "Y".
this will take 20 min.

### Your book blog is completed

## CFN for the Singapore region

Let's build App layer in Singapore

<summary><strong>Step-by-step instructions </strong></summary>

Download the 'arc309_secondayr.yaml' file from S3???(https://github.com/enghwa/MultiRegion-Modern-Architecture/blob/master/1_SecondaryRegion/arc309_secondary.yaml)

Go to the CloudFormation console in Singapore 
(screenshot)
Create stack - Select 'Template is ready' and 'Upload a template file' and 'Choose file'
Stack name (ex. arc309-jay2) and Parameters
          - ProjectName: the same project name (ex.bookjay)
          - AssetsBucketName: S3 bucket name replicated from Ireland (ex.bookjay-s3-region2)
          - SeedRepository: Web file (use default)
          - bookstoreVPC: VPC id in Singapore (output of second cdk ex. vpc-4360ec26)
          - bookstoreSubnet1: Subnet id for Elasticache (output of second cdk ex. subnet-ab9ed9dd)
          - OrderTableStreamARN: Stream ARN of Order table in Dynamo Table in Singapore (ex. arn:aws:dynamodb:ap-southeast-1:376715876263:table/bookjay-Orders/stream/2019-10-11T08:20:56.998)
Next-Next-Check "I acknowledge that AWS CloudFormation might create IAM resources with custom names." - Create stack.

This CloudFormation template may take around 20mins. In this time you can hop over to the AWS console
and watch all of the resources being created for you in CloudFormation. Open up the AWS Console in your browser
and check you are in the respective regions (EU Ireland or Asia Pacific. You should check your stack listed with your stack name such as `arc309-jay-2`. (screenshot)

Once your stack has successfully completed, navigate to the Outputs tab of your stack
where you will find an `WebApplication`. Type this URL in your broswer and your can check your bookstore. (screenshot)

https://d1zltjarei3438.cloudfront.net/

FYI. This bookstore doesn't have blog yet. It will be shown after you complete buiding the secondary region.



## Completion

Congratulations! You have successfully deployed a user interface for our users
on S3. In the next module you will learn how to configure active/active using Route53.

Module 3: [Configure Active-Active Route53](../3_Route53/README.md)


Second CDK
The endpoint should be updated in the Fargate to point the replica in Singapore region. 

aws rds describe-db-instances \ 
--db-instance-identifier <sample-instance> \
--region <region2> | grep Endpoint