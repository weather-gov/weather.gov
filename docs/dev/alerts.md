# alerts

## cloud.gov

### What do these monitor

* AWS RDS (database) disk usage
* application memory usage
* application CPU usage

### Who receives them

Each alert is mapped to a channel. See https://logs.fr.cloud.gov/app/notifications-dashboards#/channels .

To add or remove email recipients, edit the "NWS support personnel" email recipient group. See https://logs.fr.cloud.gov/app/notifications-dashboards#/email-recipient-groups .

### How to edit them

https://logs.fr.cloud.gov/app/alerting#/monitors

Each alert is an OpenSearch query. Cloud.gov documentation has a good overview of the process of setting up these alerts. https://docs.cloud.gov/platform/logs/alerting/#setting-up-alerts

## New Relic

### What do these monitor

* Apdex Score
  SELECT apdex(apm.service.apdex) as 'Apdex' FROM Metric WHERE entity.guid IN ('...', '...')
  Critical: below 0.5 for at least 5 minutes
* Error rate anomalies
  SELECT (count(apm.service.error.count) / count(apm.service.transaction.duration)) * 100 AS 'Error rate (%)' FROM Metric WHERE entity.guid IN ('...', '...') FACET appName
  Critical: deviated from the baseline 3
* High CPU Utilization
  SELECT rate(sum(apm.service.cpu.usertime.utilization), 1 second) * 100 as cpuUsage FROM Metric WHERE entity.guid IN ('...', '...')
  Critical: above 90 for at least 5 minutes
* Transaction Errors
  SELECT count(apm.service.error.count) / count(apm.service.transaction.duration) * 100 as 'Web errors' FROM Metric WHERE entity.guid IN ('...', '...') AND (transactionType = 'Web')
  Critical: above 10 for at least 5 minutes

### Who receives them

This is configured through the New Relic dashboard.

To add or remove email recipients, select "Django alert policy" from https://one.newrelic.com/alerts/condition-builder/policy-list . Under the notification tab, select "Django alerts", then find the 3 dots that will let you edit the list of email addresses.

### How to edit them

https://one.newrelic.com/alerts/condition-builder
