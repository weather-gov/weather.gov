# Deploy user settings
variable "cf_user" {
  type        = string
  description = "The service account running the terraform"
}
variable "cf_password" {
  type        = string
  sensitive   = true
  description = "The service account password"
}

# app_space settings
variable "cf_space_name" {
  type        = string
  description = "The space name to deploy the app into"
}
variable "space_deployers" {
  type        = set(string)
  default     = []
  description = "A list of users to be granted SpaceDeveloper & SpaceManager on cf_space_name"
}
variable "space_developers" {
  type        = set(string)
  default     = []
  description = "A list of users to be granted SpaceDeveloper on cf_space_name"
}
variable "allow_space_ssh" {
  type        = bool
  default     = false
  description = "Whether to allow ssh to cf_space_name"
}

# supporting services settings
variable "rds_plan_name" {
  type        = string
  default     = "small-psql"
  description = "The name of the rds plan to create"
}

variable "redis_plan_name" {
  type        = string
  default     = "redis-dev" # use redis-3node for prod
  description = "The name of the redis plan to create"
}

variable "s3_plan_name" {
  type        = string
  default     = "basic-public"
  description = "The name of the s3 plan to create"
}

# routing settings
variable "custom_domain_name" {
  type        = string
  default     = null
  description = "The custom domain name to associate with the app. Leave as null to disable the domain service and use an *.app.cloud.gov route"
}
variable "host_name" {
  type        = string
  default     = null
  description = "An optional hostname to prepend to either the custom domain name or app.cloud.gov"
}

# App environment settings
variable "env" {
  type        = string
  description = "The environment to set for the app (eg staging or production)"
}

variable "enable_api_proxy" {
  type        = bool
  default     = false
  description = "Deploy the API proxy alongside the API interop layer"
}

variable "web_instances" {
  type        = number
  default     = 1
  description = "The number of instances of the web process"
}
variable "web_memory" {
  type        = string
  default     = "256M"
  description = "The amount of memory to assign to the web processes"
}
variable "web_disk_quota" {
  type        = string
  default     = "5G"
  description = "The amount of disk memory to allocate per web instance"
}

variable "api_proxy_memory" {
  type        = string
  default     = "256M"
  description = "The amount of memory to assign to the API proxy process"
}

variable "api_interop_memory" {
  type        = string
  default     = "512M"
  description = "The amount of memory to assign to the API interop process"
}

variable "api_interop_instances" {
  type        = number
  default     = 1
  description = "The number of API interop instances"
}

variable "api_node_apps" {
  type        = number
  default     = 2
  description = "The number of node apps per instance"
}

variable "api_url" {
  type        = string
  default     = "https://api.weather.gov"
  description = "The weather API endpoint for the API interop process"
}

variable "ghwo_url" {
  type        = string
  default     = "https://www.weather.gov"
  description = "The weather GHWO endpoint for the API interop process"
}

variable "api_key" {
  type        = string
  default     = ""
  description = "The weather API key, if applicable, for the API interop process"
}

variable "git_sha_hash" {
  type        = string
  default     = ""
  description = "The git hash of the commit that is being deployed"
}

variable "web_db_max_connections" {
  type        = number
  default     = 195
  description = "The maximum number of database connections for web"
}

variable "api_db_max_connections" {
  type        = number
  default     = 195
  description = "The maximum number of database connections for interop"
}

variable "web_gevent_workers" {
  type        = number
  default     = 8
  description = "The number of gevent workers to allocate per web instance"
}

variable "api_timings_metadata" {
  type      = bool
  default  = false
  description = "Whether or not to display metadata about API request timing in interop responses"
}