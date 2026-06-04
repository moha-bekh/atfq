output "kubernetes_nodes" {
  description = "Public IPs of the cluster nodes"
  value = {
    for k, v in aws_instance.atfq_nodes : k => v.public_ip
  }
}

output "ssh_connect_master" {
  description = "Command to connect to the master node"
  value = "ssh -i ~/.ssh/${var.ssh_key_name} ubuntu@${[for n in aws_instance.atfq_nodes : n.public_ip if n.tags.Role == "master"][0]}"
}
