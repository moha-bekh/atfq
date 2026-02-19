resource "local_file" "ansible_inventory" {
  content = templatefile("${path.module}/templates/ansible_inventory.tftpl", {
    username     = var.username
    ssh_key_path = "~/.ssh/${var.ssh_key_name}"
    
    nodes = aws_instance.atfq_nodes
  })
  filename = "${path.module}/../../provisioning/inventory.yaml"
}

resource "local_file" "ansible_cfg" {
  content = templatefile("${path.module}/templates/ansible_cfg.tftpl", {
    username     = var.username
    ssh_key_path = "~/.ssh/${var.ssh_key_name}"
  })
  filename = "${path.module}/../../provisioning/ansible.cfg"
}

resource "local_file" "ansible_vars" {
  content = templatefile("${path.module}/templates/ansible_vars.tftpl", {
    username     = var.username
    region       = var.region
    pod_cidr     = var.pod_network_cidr
    
    vpc_cidr     = data.terraform_remote_state.network.outputs.vpc_cidr
    
    controller_private_ip = [for n in aws_instance.atfq_nodes : n.private_ip if n.tags.Role == "master"][0]
  })
  filename = "${path.module}/../../provisioning/group_vars/all.yaml"
}
