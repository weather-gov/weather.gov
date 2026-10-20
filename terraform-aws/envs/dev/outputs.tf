output "account_id" {
  value       = data.aws_caller_identity.current.account_id
  description = "AWS account for this env."
}

output "caller_arn" {
  value       = data.aws_caller_identity.current.arn
  description = "NEC runner role for this env."
}

output "region" {
  value       = data.aws_region.current.region
  description = "Region for this env."
}

output "rds_database_name" {
  value       = aws_db_instance.main.db_name
  description = "Name of the database."
}

output "rds_address" {
  value       = aws_db_instance.main.address
  description = "Hostname of the database instance."
}

output "rds_port" {
  value       = aws_db_instance.main.port
  description = "Port the database listens on."
}

output "task_security_group_id" {
  value       = aws_security_group.tasks.id
  description = "task security group ID"
}

output "private_subnet_ids" {
  value       = data.aws_subnets.private.ids
  description = "subnet IDs"
}
