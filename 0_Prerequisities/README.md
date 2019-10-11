# AWS Cloud9 - Cloud IDE

Login to AWS Console, go to *Ireland(eu-west-1) Region* and spin up a AWS Cloud9 environment. Please use Firefox or Chrome to open AWS Cloud9. 

https://eu-west-1.console.aws.amazon.com/cloud9/home?region=eu-west-1 

![Create AWS Cloud9](../images/00-c9-01.png)

Name your AWS Cloud9 Environment
![Create AWS Cloud9](../images/00-c9-02.png)

AWS Cloud9 is free, you only pay for the underlying EC2 instance. Select your EC2 instance type. We can use t2.micro for this lab. To save cost, AWS Cloud9 will spin down the EC2 when you are not using it.

![Create AWS Cloud9](../images/00-c9-03.png)

Click "Create environment" and AWS Cloud9 will start! It would typically take 30-60s to create your AWS Cloud9 environment.
![Create AWS Cloud9](../images/00-c9-04.png)

## Install node and npm 

![Create AWS Cloud9](../images/00-c9-05.png)

Once AWS Cloud9 is up and running, execute the following commands in the command shell of Cloud9 to clone the lab files to your Cloud9.

## Clone the workshop project
```bash
git clone https://github.com/enghwa/MultiRegion-Serverless-Workshop.git

```

Go to `wordpress-lab` directory (ex. /home/ec2-user/environment/MultiRegion-Modern-Architecture/wordpress-lab)

Deploy Wordpress for the Book blog with AWS Fargate, ALB, ACM, and Aurora MySQL in Primary Region.

```bash
//nvm ....
//need to export AWS_DEFAULT_REGION = "primary region" , eg: `eu-west-1`, 

export AWS_DEFAULT_REGION=eu-west-1
export MYSUBDOMAIN=<enter a 8 char subdomain name, eg: team5432>
npm install
npx cdk bootstrap
npx cdk@1.8.0 deploy hostedZone
npx cdk@1.8.0 deploy Wordpress-Primary

```

```
Do you wish to deploy these changes (y/n)? -> both "npx cdk@1.8.0 deploy" commands asked this question.
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


```bash
nvm install 8.9.1

nvm alias default v8.9.1

```

verify that you have the right `node` and `npm` :

```bash
enghwa:~/environment $ npm -v
5.5.1

enghwa:~/environment $ node -v
v8.9.1

enghwa:~/environment $ nvm ls
        v6.14.4  
->       v8.9.1  
         system  
default -> v8.9.1
node -> stable (-> v8.9.1) (default)
stable -> 8.9 (-> v8.9.1) (default)
iojs -> N/A (default)
lts/* -> lts/argon (-> N/A)
lts/argon -> v4.9.1 (-> N/A)
lts/boron -> v6.14.4
lts/carbon -> v8.12.0 (-> N/A)

```
## Completion
[Go back](../README.md) or
Start the lab: [Build a BookStore in Primayr Region](../1_PrimaryRegion/README.md)
