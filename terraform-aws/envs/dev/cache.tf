resource "aws_security_group" "cache" {
  name        = "weathergov-${var.env}-cache"
  description = "valkey access for weathergov-${var.env}-cache"
  vpc_id      = data.aws_vpc.main.id

  tags = {
    "noaa:subcomponent" = "cache"
  }
}

# for now, allow anything in the VPC to access valkey
resource "aws_vpc_security_group_ingress_rule" "cache" {
  security_group_id = aws_security_group.cache.id
  description       = "valkey from within the VPC"
  cidr_ipv4         = data.aws_vpc.main.cidr_block
  from_port         = 6379
  to_port           = 6379
  ip_protocol       = "tcp"

  tags = {
    "noaa:subcomponent" = "cache"
  }
}

resource "aws_elasticache_serverless_cache" "valkey" {
  name   = "weathergov-${var.env}-valkey"
  engine = "valkey"

  cache_usage_limits {
    data_storage {
      maximum = 10
      unit    = "GB"
    }
    ecpu_per_second {
      maximum = 5000
    }
  }

  daily_snapshot_time      = "09:00"
  description              = "weathergov ${var.env} valkey serverless"
  kms_key_id               = aws_kms_key.cache.arn
  major_engine_version     = "9"
  snapshot_retention_limit = 1
  security_group_ids       = [aws_security_group.cache.id]
  # we are restricted to 2 or 3 subnet ids.
  subnet_ids    = slice(data.aws_subnets.private.ids, 0, 3)
  user_group_id = aws_elasticache_user_group.valkey.user_group_id

  tags = {
    "noaa:subcomponent" = "cache"
  }
}

resource "aws_elasticache_user_group" "valkey" {
  engine        = "valkey"
  user_group_id = "weathergov-${var.env}-valkey"
  user_ids      = [aws_elasticache_user.valkey.user_id]

  tags = {
    "noaa:subcomponent" = "cache"
  }
}

resource "aws_elasticache_user" "valkey" {
  user_id              = "weathergov-${var.env}-valkeyuser"
  user_name            = "default"
  access_string        = "on ~* +@all"
  engine               = "valkey"
  passwords_wo         = random_password.valkeyuser.result
  passwords_wo_version = 1

  tags = {
    "noaa:subcomponent" = "cache"
  }
}
