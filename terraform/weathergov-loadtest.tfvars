cf_space_name   = "loadtest"
env             = "loadtest"
allow_space_ssh = true
host_name       = "weathergov-loadtest"
space_developers = [
  "james.tranovich@noaa.gov",
  "seamus.johnston@noaa.gov",
  "3068e511-a5b8-4e74-a2ed-2434ccb0b41a",
  "b47f4a63-109f-416d-a56f-17cae1d0a51c"
]
space_deployers = [
  "3068e511-a5b8-4e74-a2ed-2434ccb0b41a",
  "b47f4a63-109f-416d-a56f-17cae1d0a51c"
]
web_memory            = "1024M"
web_instances         = 1
api_interop_memory    = "1024M"
api_interop_instances = 1
api_url               = "https://preview-api.weather.gov"
redis_plan_name       = "redis-dev"
rds_plan_name         = "medium-psql-redundant"
