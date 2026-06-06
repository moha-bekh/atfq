variable "region" {
  type        = string
  description = "AWS region for the demo VM."
  default     = "eu-west-3"
}

variable "profile" {
  type        = string
  description = "AWS CLI profile to use."
  default     = "atfq-admin"
}

variable "instance_type" {
  type        = string
  description = "EC2 instance type for the demo VM."
  default     = "t3.small"
}

variable "root_volume_gb" {
  type        = number
  description = "Root EBS volume size in GiB."
  default     = 20
}

variable "key_name" {
  type        = string
  description = "AWS key pair name to create/use for the demo VM."
  default     = "atfq-demo"
}

variable "ssh_public_key_path" {
  type        = string
  description = "Local path to the SSH public key."
}

variable "allowed_ssh_cidr" {
  type        = string
  description = "CIDR allowed to SSH to the VM, for example 1.2.3.4/32."
}
