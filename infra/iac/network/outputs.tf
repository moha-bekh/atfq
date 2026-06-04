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

output "route53_zone_id" {
  description = "The ID of the Route53 hosted zone for the cluster"
  value       = aws_route53_zone.atfq_zone.zone_id
}

output "route53_nameservers" {
  description = "The DNS name servers assigned to the hosted zone. Configure these in Infomaniak (DNS Servers/NS)."
  value       = aws_route53_zone.atfq_zone.name_servers
}
