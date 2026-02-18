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

variable "ami_prefix" {
  description = "Prefix for the custom AMI created by Packer"
  type        = string
  default     = "atfq-k8s-node"
}

variable "state_bucket_name" {
  description = "The name of the S3 bucket for remote state"
  type        = string
}

variable "ssh_key_name" {
  description = "The name of the SSH key pair"
  type        = string
  default     = "atfq"
}

variable "nodes" {
  description = "Map of Kubernetes nodes to create with their roles and types"
  type = map(object({
    instance_type = string
    role          = string
  }))
  default = {
    "master-01" = { instance_type = "t3.small", role = "master" }
    "worker-01" = { instance_type = "t3.small", role = "worker" }
    "worker-02" = { instance_type = "t3.small", role = "worker" }
  }
}

variable "username" {
  description = "Default SSH username for the instances"
  type        = string
  default     = "ubuntu"
}

variable "pod_network_cidr" {
  description = "CIDR range for Kubernetes pods (ex: 10.244.0.0/16 for Flannel)"
  type        = string
  default     = "10.244.0.0/16"
}

