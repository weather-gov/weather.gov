# DNS

We currently have one domain name, beta.weather.gov. The DNS records for this name live in Akamai and are managed by NCO. If you have a question about the settings, you will have to file a ticket with them. 

Our DNS records are CNAMEs following the conventions from [here](https://cloud.gov/docs/services/external-domain-service/#how-to-create-an-instance-of-this-service). The connection between cloud.gov and the records are managed via the command line with `cf` and are only accessible to admins. 
