# Building a second bookstore in the secondary region

We completed build the first bookstore in the primary region in the previous section. In this section, we will replicate S3 bucket for static contects, Aurora MySQL for the blog content, and DynamoDB tables for the books/order/cart data from the primary region to the secondary region.

#### Enable Aurora MySQL Read replica in Singapore region

This Aurora MySQL Read replica helps you have redundancy plan when you have issue in the primary database in the primary region. The replica in Singapore region can be promoted as the primary database. 

Follow the steps to enable the read replica of Aurora in Singapore region using the AWS CLI. 

aws rds create-db-cluster \
  --db-cluster-identifier <sample-replica-cluster> \
  --engine aurora \
  --replication-source-identifier <source aurora cluster arn> \
  --region <region2>

aws rds create-db-cluster \
  --db-cluster-identifier arc309-replica-cluster \
  --engine aurora \
  --replication-source-identifier arn:aws:rds:eu-west-1:376715876263:cluster:wordpress-primary-wordpressdbclusterbda8ec52-1tketnnhp1rq9 \
  --region ap-southeast-1

aws rds describe-db-clusters --db-cluster-identifier <sample-replica-cluster> --region <region2>

aws rds describe-db-clusters --db-cluster-identifier arc309-replica-cluster --region ap-southeast-1

aws rds create-db-instance \
  --db-instance-identifier <sample-instance> \ 
  --db-cluster-identifier <sample-replica-cluster> \
  --db-instance-class <db.t3.small> \
  --engine aurora \
  --region <region2>

  aws rds create-db-instance \
  --db-instance-identifier arc309-instance \
  --db-cluster-identifier arc309-replica-cluster \
  --db-instance-class db.t3.small \
  --engine aurora \
  --region ap-southeast-1

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

### 3. Enable DynamoDB Global Table using CLI

Follow the steps to create a global table (SXRTickets) consisting of replica tables in the Ireland and 
Singapore regions using the AWS CLI. 

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









Navigate to the `2_UI/cfn` folder in your local Git repository.

## 1. Create the AWS Cognito Identity Pool, S3 bucket and Cloudfront distribution

Our first task is to setup AWS Cognito to allow our UI application to
authenticate users and gain permission to call the API. As in *Module 1*, a CloudFormation template is available to create all the
necessary resources for us.

For time reasons we are not providing console instructions for this section.  Do
feel free to review the CloudFormation template to see what is being created.

You can go ahead and deploy this template in the primary region (Ireland) using the `aws
cloudformation deploy` CLI command as before.

For the Ireland region, execute this command to enter the correct subdirectory:

    cd /home/ec2-user/environment/MultiRegion-Serverless-Workshop/2_UI/cfn

The full command will look like:

    aws cloudformation deploy \
    --region eu-west-1 \
    --template-file web-ui-stack.yaml \
    --stack-name ticket-service-ui \
    --capabilities CAPABILITY_IAM

Again, you can confirm that this was created successfully and see the resource
in the AWS Console. Navigate to the CloudFormation service and take a look at
the *Outputs* tab. This time you will see these keys:

* `CognitoIdentityPoolId`
* `BucketName`
<!-- * `BucketURL` -->

Take note of the values for each of these, you will need them in the next steps.

</details>

![bucket-name](images/s3bucket-name.png)

#### Cloudfront distribution for S3 bucket
Next, we need to create a Cloudfront distribution for the S3 bucket that we created above (Step 1):

    aws cloudformation deploy \
    --region eu-west-1 \
    --template-file webs3bucket_with_cloudfront.yaml \
    --stack-name ticket-service-ui-cloudfront \
    --parameter-overrides S3BucketName=[bucket-name]

Note that you must replace `[bucket-name]` in this command with the `BucketName` output from the CloudFormation stack in step 1. . It typically takes about 15 minutes for the CloudFormation stack creation to finish. You can move forward to configure Cognito and Facebook Developer ID.

## 2. Configure Federated Identities with Cognito

Now we'll set up our login with Facebook capability, this allows any Facebook users to login to our application. 

Go into your Facebook Developer account and create an new application by
[following these steps](https://developers.facebook.com/apps/).

Click on **Add a New App** in the upper right corner: 

![Add new FB app](images/facebook-add-app2.png)

Name your App anything you would like, and then click **Create App ID**. (Take note of the App ID)

Once you have created your App, you will need to select *Settings* -> *Basic* from the left menu.

<!-- ![FB Select Settings](images/facebook-select-settings.png) -->

Next choose **Add Platform** from the bottom of the Settings screenshot:

![FB Select Add Platform](images/facebook-add-platform2.png)

Choose **Website** from the list of choices that comes up:

![FB Select Website](images/facebook-select-website.png)

Then enter the Cloudfront URL (this is the CloudFormation output - `CfDistributionDomainNameWithOAI` from the `ticket-service-ui-cloudfront` stack you deployed in earlier steps in this module) into the *Site URL* dialog
and then select **Save Changes** from the lower right.
![FB enter URL and save](images/facebook-website-url2.png)

Once you are done with this, make note of the Facebook App ID - you will need this
in the next step as well as when you build the website code in the next section.

<!-- ![Facebook Config](images/facebook-config.png) -->

#### Cognito Identity Pool with Facebook as identity provider
Next, we must configure the Cognito Identity Pool to use Facebook as our
identity provider. To do this, open up the AWS Console in your browser and
navigate to Cognito from the menu. Double check that you are still in the
primary region (Ireland).

1. Choose **Manage Identities Pools** and select the `SXRIdentityPool`.
2. Click the **Edit Identity Pool** button in the top right
3. Take note of the `Identity pool ID` noted at the top of this page (You can find this ID in the outputs of `ticket-service-ui` CloudFormation stack)
4. Navigate to the **Authentication Providers** section.
5. Select the **Facebook** tab, hit Unlock then specify your Facebook App ID (15 digits number)
6. Save Changes at the bottom of the page.

![Cognito IDP](images/cognito-idp.png)

## 3. Configure and build the application code

Our application will need to know the location of the API in order to push and
pull data from it. In addition, the application will need to know our Facebook
App ID and Cognito Identity Pool ID so it can authenticate our users. 

All of these attributes must be configured in
`2_UI/src/environments/environment.ts`. Open this file inside AWS Cloud9 and edit
this file. Please be sure to address all of the parameters the file
requires or you will fail.  

You can obtain the Cognito Identity Pool ID from the *Outputs* of the CloudfFormation
template (`ticket-service-ui` stack) you deployed above.  Ensure that you copy the entire string,
including the AWS region (in this case, it should be `eu-west-1`)

If you used the console instructions to deploy Module 1,
then you can obtain the API Gateway Endpoint using the same method you used when you
tested at the end of the previous module. If you used the CLI instructions, you can obtaing the API Gateway Endpoit from the *Outputs* of the CloudfFormation template (`wild-rydes-api` stack). Ensure you do *NOT* append `ticket` to
the end of the URL but make sure you do have a `/` at the end like the comments in
the file request.

![environment-ts](images/environment-ts.png)

#### Build your AngularJS project

In your AWS Cloud9 shell, build your AngularJS project:
<!-- You will need Node Package Manager (NPM) installed on your local machine
(check out the [workshop prerequisites](../README.md#prerequisites)) in order
to build the application. You can follow instructions [Dev Instance
Setup](../README_InstallDevDependencies.md) to set up a dev instance. Once you
have created your dev instance build your project by executing the following: -->

- go to the root folder of the ui project, `cd /home/ec2-user/environment/MultiRegion-Serverless-Workshop/2_UI`
- run `npm install` to install project dependencies
- build your app with by running `npm run build`

If you get an error about NPM command not found, then go back and check the
[prerequisites section of the README](../README_Cloud9.md) to find instructions to install NPM.

This will produce a `dist/` folder containing the compiled application with your
custom settings.


## 4. Upload the application

Next, you'll need to upload the UI to the S3 website bucket specified in step 1. You can
do this with:

    aws s3 sync --delete dist/ s3://[bucket_name]

Note that you must replace `[bucket-name]` in this command with the bucket
name output from the CloudFormation stack in step 1.

#### Update Facebook App setting
Navigate back to Facebook App setting, update "App Domains" and "Privacy Policy URL" with the Cloudfront URL. Select any category (Example: Education). Toggle on the "Off" button at the top right corner to make the App public.

![FB Make Public](images/facebook-make-public2.png)

To confirm everything went as expected, navigate to your Cloudfront URL. You should see our
simple ticketing application. Go ahead and login using your Facebook account
and then submit a couple of tickets to check that everything is working.

If you have trouble in this step, double check your configured settings and
Facebook Developer account configuration. Note that if you change any
of the settings you will need to run *npm run build* again and then upload the website
code to your S3 bucket again.

![App Screenshot](images/app-screenshot2.png)

## Completion

Congratulations! You have successfully deployed a user interface for our users
on S3. In the next module you will learn how to configure active/active using Route53.

Module 3: [Configure Active-Active Route53](../3_Route53/README.md)


Second CDK
The endpoint should be updated in the Fargate to point the replica in Singapore region. 

aws rds describe-db-instances \ 
--db-instance-identifier <sample-instance> \
--region <region2> | grep Endpoint