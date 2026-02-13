resource "aws_iam_role" "atfq_admin" {
  name = var.atfq_admin_role_name

  assume_role_policy = templatefile("${path.module}/policy/role-atfq-admin.json", {
    account_id = data.aws_caller_identity.current.account_id
    role_name  = var.atfq_admin_role_name
  })
}

resource "aws_iam_policy" "atfq_admin_policy" {
  name        = "atfq-admin-policy"
  description = "Least privilege policy for atfq admin"
  policy      = file("${path.module}/policy/policy-atfq-admin.json")
}

resource "aws_iam_role_policy_attachment" "atfq_admin_attach" {
  role       = aws_iam_role.atfq_admin.name
  policy_arn = aws_iam_policy.atfq_admin_policy.arn
}
