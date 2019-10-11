# Building the Bookstore in your Primary Region

## Building your book blog

In this module, you will deploy Bookstore application in Irelad region. This components include followings:
1. S3 - Web statci content
2. API Gateway and Cognito - App layer with authentication
3. DynamoDB - Books, Order, Cart table
4. Lambda - multiple functions

You will also create the IAM polices and roles required by these components.

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

Now, you book blog is built. Please verify with following
"https://blog.<MYSUBDOMAIN>.multi-region.xyz/"

You need the VPC id and Subnet ID for the next steps. You can check it in Cloud9 console of Cloudformation output tab in the Primary region.

## Building the bookstore

**Frontend**

Build artifacts are stored in a S3 bucket where web application assets are maintained (like book cover photos, web graphics, etc.). Amazon CloudFront caches the frontend content from S3, presenting the application to the user via a CloudFront distribution.  The frontend interacts with Amazon Cognito and Amazon API Gateway only.  Amazon Cognito is used for all authentication requests, whereas API Gateway (and Lambda) is used for all API calls interacting across DynamoDB, ElasticSearch, ElastiCache, and Neptune. 

**Backend**

The core of the backend infrastructure consists of Amazon Cognito, Amazon DynamoDB, AWS Lambda, and Amazon API Gateway. The application leverages Amazon Cognito for user authentication, and Amazon DynamoDB to store all of the data for books, orders, and the checkout cart. As books and orders are added, Amazon DynamoDB Streams push updates to AWS Lambda functions that update the Amazon Elasticsearch cluster and Amazon ElasticCache for Redis cluster.  Amazon Elasticsearch powers search functionality for books, and Amazon Neptune stores information on a user's social graph and book purchases to power recommendations. Amazon ElasticCache for Redis powers the books leaderboard. 

### AWS Lambda

AWS Lambda is used in a few different places to run the application, as shown in the architecture diagram.  The important Lambda functions that are deployed as part of the template are shown below, and available in the [functions](/functions) folder.  In the cases where the response fields are blank, the application will return a statusCode 200 or 500 for success or failure, respectively.

### Amazon ElastiCache for Redis

Amazon ElastiCache for Redis is used to provide the best sellers/leaderboard functionality.  In other words, the books that are the most ordered will be shown dynamically at the top of the best sellers list. 

For the purposes of creating the leaderboard, the AWS Bookstore Demo App utilized [ZINCRBY](https://redis.io/commands/zincrby), which *“Increments the score of member in the sorted set stored at key byincrement. If member does not exist in the sorted set, it is added with increment as its score (as if its previous score was 0.0). If key does not exist, a new sorted set with the specified member as its sole member is created.”*

The information to populate the leaderboard is provided from DynamoDB via DynamoDB Streams.  Whenever an order is placed (and subsequently created in the **Orders** table), this is streamed to Lambda, which updates the cache in ElastiCache for Redis.  The Lambda function used to pass this information is **UpdateBestSellers**. 

### Amazon CloudFront and Amazon S3

Amazon CloudFront hosts the web application frontend that users interface with.  This includes web assets like pages and images.  For demo purposes, CloudFormation pulls these resources from S3.

**Developer Tools**

The code is hosted in AWS CodeCommit. AWS CodePipeline builds the web application using AWS CodeBuild. After successfully building, CodeBuild copies the build artifacts into a S3 bucket where the web application assets are maintained (like book cover photos, web graphics, etc.). Along with uploading to Amazon S3, CodeBuild invalidates the cache so users always see the latest experience when accessing the storefront through the Amazon CloudFront distribution.  AWS CodeCommit. AWS CodePipeline, and AWS CodeBuild are used in the deployment and update processes only, not while the application is in a steady-state of use.

![Developer Tools Diagram](assets/readmeImages/DeveloperTools.png)

<summary><strong>Step-by-step instructions </strong></summary>

Download the 'arc309_primary.yaml' file from S3???(https://github.com/enghwa/MultiRegion-Modern-Architecture/blob/master/1_PrimaryRegion/arc309_primary.yaml)

Go to the CloudFormation console in Ireland 
(screenshot)
Create stack - Select 'Template is ready' and 'Upload a template file' and 'Choose file'
Stack name (ex. arc309-jay) and Parameters
          - ProjectName: 10 characters with lowercase (no number) (ex.bookjay)
          - AssetsBucketName: S3 bucket name with lowercase (ex.bookjay-s3)
          - SeedRepository: Web file (use default)
          - bookstoreVPC: VPC id (output of cdk)
          - bookstoreSubnet1: Subnet id for Elasticache (output of cdk)
Next-Next-Check "I acknowledge that AWS CloudFormation might create IAM resources with custom names." - Create stack.

This CloudFormation template may take around 20mins. In this time you can hop over to the AWS console
and watch all of the resources being created for you in CloudFormation. Open up the AWS Console in your browser
and check you are in the respective regions (EU Ireland or Asia Pacific. You should check your stack listed with your stack name such as `arc309-jay-1`. (screenshot)

Once your stack has successfully completed, navigate to the Outputs tab of your stack
where you will find an `WebApplication`. Type this URL in your broswer and your can check your bookstore. (screenshot)

https://d1zltjarei3438.cloudfront.net/

FYI. This bookstore doesn't have blog yet. It will be shown after you complete buiding the secondary region.

## Completion

Congratulations you have configured the bookstore in the primary region. In the next module you will replicate your data to the secondary region and build the same bookstore in the secondary region for the high availability. 

You need to write down the S3 Replication Role ARN to use it in the next step.

Module 2: [Build a Secondary region](../2_SecondaryRegion/README.md)
