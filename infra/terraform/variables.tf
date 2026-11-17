variable "environment" {
  description = "Deployment environment; each environment needs its own state key."
  type        = string

  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "environment must be dev or prod."
  }
}

variable "aws_region" {
  description = "Region for the frontend bucket."
  type        = string
  default     = "ap-southeast-1"
}

variable "aws_account_id" {
  description = "Expected deployment account; also makes bucket names unique."
  type        = string

  validation {
    condition     = can(regex("^[0-9]{12}$", var.aws_account_id))
    error_message = "aws_account_id must contain exactly 12 digits."
  }
}
