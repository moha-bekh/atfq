resource "aws_key_pair" "atfq" {
  key_name   = var.ssh_key_name
  public_key = file(pathexpand("~/.ssh/${var.ssh_key_name}.pub"))
}
