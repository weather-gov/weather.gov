output "bucket_name" {
  value       = aws_s3_bucket.state.id
  description = "shared state bucket"
}

output "bucket_arn" {
  value = aws_s3_bucket.state.arn
}

output "vpc_id" {
  value       = aws_vpc.main.id
  description = "Hostname of the database instance."
}
