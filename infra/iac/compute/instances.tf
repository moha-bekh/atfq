resource "aws_instance" "atfq_nodes" {
  for_each = var.nodes

  ami           = data.aws_ami.k8s_custom.id
  instance_type = each.value.instance_type

  subnet_id = data.terraform_remote_state.network.outputs.public_subnet_id

  key_name               = aws_key_pair.atfq.key_name
  vpc_security_group_ids = [aws_security_group.atfq_sg.id]

  associate_public_ip_address = true
  source_dest_check           = false

  user_data = <<-EOF
              #!/bin/bash
              hostnamectl set-hostname ${each.key}
              echo "127.0.0.1 ${each.key}" >> /etc/hosts
              EOF

  tags = {
    Name    = "atfq-${each.key}"
    Project = "atfq"
    Role    = each.value.role
  }

  lifecycle {
    ignore_changes = [ami]
  }
}
