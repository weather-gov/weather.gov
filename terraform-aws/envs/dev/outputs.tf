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
