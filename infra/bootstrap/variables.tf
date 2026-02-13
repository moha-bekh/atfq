variable "region" {
  type        = string
  description = "The AWS region where resources will be created."
  default     = "eu-west-3"
}

variable "profile" {
  type        = string
  description = "The AWS CLI profile to use for local authentication."
}

variable "state_bucket_name" {
  type        = string
  description = "The name of the S3 bucket to store Terraform state (must be unique)."
}

variable "atfq_admin_role_name" {
  type        = string
  description = "The name of the IAM role for ATFQ administration."
}

variable "github_repo" {
  type        = string
  description = "The GitHub repository in 'owner/repo' format (e.g., moha/atfq-infra)."
}
