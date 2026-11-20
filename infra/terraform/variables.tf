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

variable "api_base_url" {
  description = "Same API URL used by the Angular build; adds only its origin to CSP. Cookie refresh requires same-site HTTPS domains."
  type        = string
  default     = "/api"
  validation {
    condition     = var.api_base_url == "/api" || can(regex("^https://[A-Za-z0-9.-]+(:[0-9]+)?(/[^?#]*)?$", var.api_base_url))
    error_message = "api_base_url must be /api or an HTTPS URL without credentials/query/fragment."
  }
}

variable "api_routes" {
  description = "CloudFront behaviors for /api: output cloudfront_api_routes of corp-portal-api. Empty = /api answers 503."
  type = list(object({
    path_pattern = string
    origin_id    = string
    domain_name  = string
  }))
  default = []

  validation {
    condition = alltrue([
      for route in var.api_routes :
      startswith(route.path_pattern, "/api/") && can(regex("^[A-Za-z0-9.-]+$", route.domain_name)) && route.origin_id != "frontend"
    ])
    error_message = "Each route needs an /api/ path, a bare host name and an origin_id other than frontend."
  }

  validation {
    condition = alltrue([
      for id in distinct([for route in var.api_routes : route.origin_id]) :
      length(distinct([for route in var.api_routes : route.domain_name if route.origin_id == id])) == 1
    ])
    error_message = "Routes that share an origin_id must share its domain_name."
  }
}
