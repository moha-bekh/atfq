variable "region" {
  description = "The AWS region to deploy the infrastructure"
  type        = string
  default     = "eu-west-3"
}

variable "profile" {
  description = "The AWS CLI profile to use"
  type        = string
}

variable "account_id" {
  description = "The AWS account ID"
  type        = string
  sensitive   = true
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for the public subnet"
  type        = string
  default     = "10.0.1.0/24"
}
