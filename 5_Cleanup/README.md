# Cleaning Up after the Workshop

Here are high level instructions on cleaning up after you have completed the
workshop.

### Module 1_API:

If you manually deploy a region in module 1_API

- Delete the three Lambda functions
- Delete the SXRTickets DynamoDB table
- Delete the API Gateway and Custom Domains
- Delete the SSL Certificates in ACM (you may need to wait some time for resources
  to fully un-deploy before this is possible)
- Delete the IAM Roles and Policies you created

If you used CloudFormation to deploy a 1_API regions

- In the console, select the correct regions
- Go into CloudFormation and select the wild-rydes-api stack and then select *delete*
- The template will be deleted along with all resources it created

### Module 2_UI

- In the Console, go into S3, and *Empty* but don't delete the bucket hosting
  your website content
- Go to `CloudFormation` console, Select the web-ui-stack stack and then *delete* it.
- The template will be deleted along with all resources it created

### Module 3_Route53

- In Route53, remove the Health Check as well as all DNS entries you created
  during the workshop
- In Amazon Certificate Manager, delete all SSL certificates you created (both regions)


### Delete Cloud9 environment (EC2 and EBS)

- In Cloud9, select the environment you created and then click **Delete** (this will delete
  it completely, so if there is any data on it you wanted to save, ensure you take
  care of that first)
