cf_space_name   = "prod"
env             = "prod"
allow_space_ssh = true
host_name       = "weathergov-prod"
space_deployers = [
  "4423d1b0-39f4-4670-9aba-75becd4b7e4e"
]
web_memory            = "1024M"
web_instances         = 1
api_interop_memory    = "1024M"
api_interop_instances = 2
custom_domain_name    = "beta.weather.gov"
interop_url           = "https://api-weathergov-prod.app.cloud.gov"
redis_plan_name       = "redis-3node"
