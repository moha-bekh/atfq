output "vpc_id" {
  description = "ID du VPC pour les Security Groups"
  value       = aws_vpc.atfq_vpc.id
}

output "public_subnet_id" {
  description = "ID du Subnet pour les instances EC2"
  value       = aws_subnet.atfq_public_subnet.id
}

output "vpc_cidr" {
  description = "CIDR du VPC pour les règles de flux internes"
  value       = aws_vpc.atfq_vpc.cidr_block
}

