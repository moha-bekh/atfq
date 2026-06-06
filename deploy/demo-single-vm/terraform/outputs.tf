output "public_ip" {
  description = "Demo VM public IPv4 address."
  value       = aws_instance.demo.public_ip
}

output "ssh_command" {
  description = "SSH command for the demo VM."
  value       = "ssh ubuntu@${aws_instance.demo.public_ip}"
}
