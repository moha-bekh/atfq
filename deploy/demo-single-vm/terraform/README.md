# Demo VM Terraform

Creates a minimal public EC2 instance for the demo stack.

This uses the default VPC to keep the demo cheap and simple. If your AWS account
does not have a default VPC in `eu-west-3`, create one or adapt `vpc_id` and
`subnet_id` in `main.tf`.

## Usage

```bash
terraform init
terraform apply \
  -var='profile=atfq-admin' \
  -var='ssh_public_key_path=~/.ssh/atfq.pub' \
  -var='allowed_ssh_cidr=<your-ip>/32'
```

After apply:

```bash
ssh ubuntu@$(terraform output -raw public_ip)
```

Then install/deploy from `deploy/demo-single-vm/README.md`.
