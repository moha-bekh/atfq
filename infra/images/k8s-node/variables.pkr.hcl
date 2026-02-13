variable "region" {
  type        = string
  description = "The AWS region where the AMI will be built and stored."
  default     = "eu-west-3"
}

variable "profile" {
  type        = string
  description = "The local AWS CLI profile to use for authentication (set to null for CI/CD environments)."
  default     = null
}

variable "instance_type" {
  type        = string
  description = "The EC2 instance type used to build the AMI. A t3.medium or larger is recommended for K8s installation."
  default     = "t3.small"
}

variable "ssh_user" {
  type        = string
  description = "The username used for the SSH connection to the build instance."
  default     = "ubuntu"
}

variable "ami_prefix" {
  type        = string
  description = "Prefix for the generated AMI name. A timestamp will be appended to ensure uniqueness."
  default     = "k8s-node-ubuntu"
}

variable "k8s_version" {
  type        = string
  description = "The Kubernetes version to install (e.g., 1.28). This value is passed as an environment variable to the setup script."
  default     = "1.28"
}
