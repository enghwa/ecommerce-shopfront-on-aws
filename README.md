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
ALB, Fargate, Aurora (with custom parameter group)

### 1. Primary region - CFN
Remove metadata, neptune, search (dependson), apigateway (auth:none) 
Use CDK VPC and subnet info for cache

### 2. Build multi-region solution - Aurora
aws rds create-db-cluster \
  --db-cluster-identifier sample-replica-cluster \
  --engine aurora \
  --replication-source-identifier <source aurora arn> 



