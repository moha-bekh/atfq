source "amazon-ebs" "ubuntu" {
  region        = var.region
  profile       = var.profile
  instance_type = var.instance_type
  ssh_username  = var.ssh_user
  ami_name      = "${var.ami_prefix}-${formatdate("YYYYMMDD-hhmm", timestamp())}"

  source_ami_filter {
    filters = {
      name                = "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"
      root-device-type    = "ebs"
      virtualization-type = "hvm"
    }
    most_recent = true
    owners      = ["099720109477"]
  }
}

build {
  sources = ["source.amazon-ebs.ubuntu"]

  provisioner "shell" {
    script = "scripts/install.sh"
    environment_vars = [
      "K8S_VERSION=${var.k8s_version}"
    ]
  }
}

