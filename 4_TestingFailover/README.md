# Testing Multi-region Failover

To have real confidence in our multi-region active-active setup, we need to test it.
In this module we will artificially break our
primary region and observe our failover in action.

To demonstrate this we coduct a scenario where a developer
accidentally deletes production setting in API gateway in
primary region (Ireland), thus breaking the API layer. We expect our application detects
this failure and adjusts the DNS settings to continue service of the
application from the second region (Singapore)
maintaining availability of the API/Database and functionality of the UI.

## Breaking the primary region

In the AWS Console, ensure you are in your primary region (Ireland) then head over to
`API Gateway`, choose your `Custom Domain Name`. Then delete the `Base Path Mappings` and save changes.

![Failover](../images/04-failover-01.png)

## Verifying the failure

Now head over to `Route53` and select `Health checks`. Within a few
minutes, your health check should turn from Green to `Red` and display a
failure.

![Failover](../images/04-failover-02.png)

Since your DNS records are configured to use this health check, Route53 should
automatically use this information to point your domain at your another
region.

You can validate this failover scenario when you visit `https://api-ir.arc30901.multi-region.xyz/books` with `Interanl Server Error`. However, you will get the book list when you visit `https://api.arc30901.multi-region.xyz/books` as the Singapore region API is working properly (same as `https://api-sg.arc30901.multi-region.xyz/books`. 

You're UI should also continue to 
function and you should still be able to view and order books.

![Failed over health check response](images/failed-over-response.png)

To confirm everything went as expected, go to your ticketing application (Cloudfront URL)
and create a ticket again. You should see your application indicates Singapore region. 

![Create ticket in Singapore](images/create-ticket.png)

And your DynamoDB tables in both Irelad and Singapore have the same items though you created
tickets in any places. 

![DynamoDB Global tables](images/dynamodb-table.png)

Don't forget to switch your API Gateway configuration back to the
*SXRHealthCheckFunction* once you are done testing failover!

## Completion

Congratulations! You have now setup and verified an API that fails over from
one region to another automatically in the event of a disaster.

If you are feeling adventurous, you can proceed to the optional lab - [S3 Cross Region Replication and CloudFront Custom Domain](../6_S3Replication/README.md).
Else to end the lab and prevent further AWS charges, please clean-up the AWS resources created in this workshop by following the [steps here.](../5_Cleanup/README.md)

The application you have built includes many components that you would need to
build your own Serverless applications in AWS including [AWS
Cognito](https://aws.amazon.com/cognito) for authentication, [AWS
Lambda](https://aws.amazon.com/lambda) for compute, [Amazon API
Gateway](https://aws.amazon.com/apigateway) for exposing an HTTP interface and
[DynamoDB](https://aws.amazon.com/dynamodb) for storing application data. A
good next step would be to start modifying this application to add your own
features and explore these services further.
