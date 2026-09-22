# filter for the NEC VPC via tag:Name
data "aws_vpc" "main" {
  filter {
    name   = "tag:Name"
    values = ["*-${var.env}-vpc-*"]
  }
}

# similarly filter private subnets in the VPC by tag:Name
data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  filter {
    name   = "tag:Name"
    values = ["*-private-subnet-*"]
  }
}
