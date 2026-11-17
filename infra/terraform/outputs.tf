output "bucket_name" {
  value = aws_s3_bucket.frontend.bucket
}

output "distribution_id" {
  value = aws_cloudfront_distribution.frontend.id
}

output "frontend_url" {
  value = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "environment" {
  value = var.environment
}

output "aws_account_id" {
  value = var.aws_account_id
}
