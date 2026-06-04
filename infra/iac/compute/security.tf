data "http" "my_ip" {
  url = "https://ipv4.icanhazip.com"
}

locals {
  current_ip = chomp(data.http.my_ip.response_body)
}

resource "aws_security_group" "atfq_sg" {
  name        = "atfq-cluster-sg"
  description = "Common security group for Master and Workers"
  vpc_id      = data.terraform_remote_state.network.outputs.vpc_id

  tags = {
    Name = "atfq-security-group"
  }
}

resource "aws_security_group_rule" "allow_all_egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.atfq_sg.id
}

resource "aws_security_group_rule" "allow_vpc_internal" {
  type              = "ingress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["10.0.0.0/16"]
  security_group_id = aws_security_group.atfq_sg.id
}

# SSH
resource "aws_security_group_rule" "allow_ssh_my_ip" {
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = ["${local.current_ip}/32"]
  security_group_id = aws_security_group.atfq_sg.id
}

# KUBE API
resource "aws_security_group_rule" "allow_api_external" {
  type              = "ingress"
  from_port         = 6443
  to_port           = 6443
  protocol          = "tcp"
  cidr_blocks       = ["${local.current_ip}/32"]
  security_group_id = aws_security_group.atfq_sg.id
}

# CILIUM HEALTH CHECKS
resource "aws_security_group_rule" "allow_cilium_health" {
  type              = "ingress"
  from_port         = 4240
  to_port           = 4240
  protocol          = "tcp"
  self              = true
  security_group_id = aws_security_group.atfq_sg.id
}

# CILIUM VXLAN
resource "aws_security_group_rule" "allow_cilium_vxlan" {
  type              = "ingress"
  from_port         = 8472
  to_port           = 8472
  protocol          = "udp"
  self              = true
  security_group_id = aws_security_group.atfq_sg.id
}

resource "aws_security_group_rule" "allow_web_traffic" {
  type              = "ingress"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.atfq_sg.id
}

resource "aws_security_group_rule" "allow_https_traffic" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.atfq_sg.id
}
