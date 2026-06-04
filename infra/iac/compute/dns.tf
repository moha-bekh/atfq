resource "aws_route53_record" "atfq_app" {
  zone_id = data.terraform_remote_state.network.outputs.route53_zone_id

  name = "atfq.org"
  type = "A"
  ttl  = "300"

  records = [aws_instance.atfq_nodes["worker-01"].public_ip]
}

resource "aws_route53_record" "atfq_www" {
  zone_id = data.terraform_remote_state.network.outputs.route53_zone_id

  name = "www.atfq.org"
  type = "A"
  ttl  = "300"

  records = [aws_instance.atfq_nodes["worker-01"].public_ip]
}
