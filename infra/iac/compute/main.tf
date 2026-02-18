data "terraform_remote_state" "network" {
  backend = "s3"
  config = {
    bucket  = var.state_bucket_name
    key     = "network/terraform.tfstate"
    region  = var.region
    profile = var.profile
  }
}

data "aws_ami" "k8s_custom" {
  most_recent = true
  owners      = ["self"]

  filter {
    name   = "name"
    values = ["${var.ami_prefix}-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}
