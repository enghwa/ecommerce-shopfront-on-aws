# Cleaning Up after the Workshop

Here are high level instructions on cleaning up after you have completed the
workshop.

## 1. Delete CloudFront Origin Access
The CloudFront origin access identity is still being used, hence, we need to delete the AssetsBucketOriginAccessIdentity manually first.
Go to `CloudFront` and select your `CloudFront Distribution`. Go to `Origins and Origin Groups` and delete the `Origin Group` and `Orgin in Singapore` that you created.

## 2. Delete API Gateway
Go to `Custom Domain Names` in `API Gateway` in Singapore and select your `*.arc30901.multi-region.xyz` domain name. Click `x` button to delete it.

## 3. Delete Aurora Read Replicas
You created the Aurora Read Replica in Singapore using CLI. Go to `RDS`, select Read Replica Cluster `arc309-replica-cluster`, and select `Promte` in `Actions`. We need to promte the read replia as standalone to delete the instance. Then select Read Replica Instance `arc309-replica-instance` and select `Delete` in `Actions`. 

## 4. Delete S3 buckets
You need to empty the S3 bucket to delete resources. Go to `S3` and delete workshop related buckets: 
* `cdktoolkit-stagingbucket-xxxxxxx` in Singapore and Ireland
* `bookstore bucket` in Singapore and Ireland
* `pipeline bucket` in Ireland

## 5. Delete S3 Replication role
Go to IAM and delete S3 replication role such as `bookstore-S3replicationRole`.

## 6. Delete CloudFormation staks

You deployed 5 CloudFormation stacks in `Ireland` and 3 stacks in `Singapore` during the workshop.

<!-- * Ireland: `Ireland API stack`, `Workpress-primary`, `hostedZone`, `cloud9`, `CDKTookit`
* Singapore: `Singpore API stack`, `Workpress-Secondary`, `CDKTookit` -->

This is an oder to delete Stacks:
1. `Singpore API stack` - `Workpress-Secondary` - `CDKTookit` in Singapore
2. `Ireland API stack` - `Workpress-primary` - `hostedZone` - `CDKTookit` - `aws-cloud9` in Ireland

To delete Cloudformation stacks, go to `CloudFormation` in the specific region, select the stack name and click `Delete` button. The template will delete along with all resources it created. 

### Module 3_Route53

- In Route53, remove the Health Check as well as all DNS entries you created
  during the workshop
- In Amazon Certificate Manager, delete all SSL certificates you created (both regions)


### Delete Cloud9 environment (EC2 and EBS)

- In Cloud9, select the environment you created and then click **Delete** (this will delete
  it completely, so if there is any data on it you wanted to save, ensure you take
  care of that first)
