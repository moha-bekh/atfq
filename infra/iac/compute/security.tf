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

resource "aws_security_group_rule" "allow_internal_cluster" {
  type              = "ingress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  self              = true
  security_group_id = aws_security_group.atfq_sg.id
}

resource "aws_security_group_rule" "allow_internal_vpc" {
  type              = "ingress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = [data.terraform_remote_state.network.outputs.vpc_cidr]
  security_group_id = aws_security_group.atfq_sg.id
}

data "http" "my_ip" {
  url = "https://ifconfig.me/ip"
}

resource "aws_security_group_rule" "allow_ssh_my_ip" {
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = ["${chomp(data.http.my_ip.response_body)}/32"]
  security_group_id = aws_security_group.atfq_sg.id
}

# INGRESS KUBE API
resource "aws_security_group_rule" "allow_api_external" {
  type              = "ingress"
  from_port         = 6443
  to_port           = 6443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"] 
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

# INGRESS NODEPORT (30000-32767)
resource "aws_security_group_rule" "allow_nodeports" {
  type              = "ingress"
  from_port         = 30000
  to_port           = 32767
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.atfq_sg.id
}
