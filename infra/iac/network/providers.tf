terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }

  }

  backend "s3" {}
}

provider "aws" {
  region  = var.region
  profile = var.profile

  assume_role {
    role_arn = "arn:aws:iam::${var.account_id}:role/atfq-admin"
  }

  default_tags {
    tags = {
      Project   = "atfq"
      ManagedBy = "terraform"
      Layer     = "network"
    }
  }
}

