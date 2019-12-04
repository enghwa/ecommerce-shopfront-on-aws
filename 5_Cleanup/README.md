# Cleaning Up after the Workshop

Here are high level instructions on cleaning up after you have completed the
workshop.

## 1. Delete CloudFront Origin Access
The CloudFront origin access identity is still being used, hence, we need to delete the AssetsBucketOriginAccessIdentity manually first.
Go to `CloudFront` and select your `CloudFront Distribution`. Go to `Origins and Origin Groups` and delete the `Origin Group` and `Orgin` that you created.

## 2. Delete API Gateway
Go to `Custom Domain Names` in `API Gateway` in `Singapore` and select your `*.<MYSUBDOMAIN>.multi-region.xyz` domain name. Click `x` button to delete it.

## 3. Delete Aurora Read Replicas
You created the Aurora Read Replica in `Singapore` using CLI. Go to `RDS` console, select Read Replica Cluster `arc309-replica-cluster`, and select `Promote` in `Actions`. We need to promte the read replia as standalone to delete the instance. Then select Read Replica Instance `arc309-replica-instance` and select `Delete` in `Actions`. In the deletion window, uncheck `Create snapshot`, check `acknowledgement`, type `delete me`, and click `Delete`.

## 4. Delete S3 buckets and S3 Replication role
You need to empty the S3 bucket to delete resources. Go to `S3` console and delete workshop related buckets: 
* `cdktoolkit-stagingbucket-xxxxxxx` in Singapore and Ireland
* `bookstore bucket` in Singapore and Ireland
* `pipeline bucket` in Ireland

Go to IAM and delete S3 replication role such as `bookstore-S3replicationRole`.

## 5. Delete Route 53 Record Sets and Health Check 
Go to Route 53, select your `Hosted Zones`, select all your `Record Set`, and `Delete Record Set`. 
Select `Health Checks` and delete existing `Health Checks` for Ireland and Singapore.

## 6. Delete CloudFormation stacks

You deployed 5 CloudFormation stacks in `Ireland` and 3 stacks in `Singapore` during the workshop.

The stacks must be deleted in the following order:
1. `MyBookstoreSingapore` stack - `Workpress-Secondary` - `CDKTookit` in Singapore
2. `MyBookstoreIreland` stack - `Workpress-primary` - `hostedZone` - `CDKTookit` - `aws-cloud9` in Ireland
(You can only delete the `MyBookstoreIreland` stack 24 hours later after you added the DyanmoDB Global Table)

To delete Cloudformation stacks, go to `CloudFormation` in the specific region, select the stack name and click `Delete` button. The template will delete along with all resources it created. 



