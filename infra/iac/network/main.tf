resource "aws_vpc" "atfq_vpc" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "atfq-vpc" }
}

resource "aws_subnet" "atfq_public_subnet" {
  vpc_id                  = aws_vpc.atfq_vpc.id
  cidr_block              = var.public_subnet_cidr
  map_public_ip_on_launch = true
  availability_zone       = "${var.region}a" 

  tags = { Name = "atfq-public-subnet" }
}

resource "aws_internet_gateway" "atfq_gw" {
  vpc_id = aws_vpc.atfq_vpc.id
  tags   = { Name = "atfq-igw" }
}

resource "aws_route_table" "atfq_route_table" {
  vpc_id = aws_vpc.atfq_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.atfq_gw.id
  }

  tags = { Name = "atfq-public-rt" }
}

resource "aws_route_table_association" "atfq_public_subnet_association" {
  subnet_id      = aws_subnet.atfq_public_subnet.id
  route_table_id = aws_route_table.atfq_route_table.id
}

