resource "random_password" "db_master" {
  length  = 32
  special = true
  # Exclude characters that could cause issues in connection strings
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_db_subnet_group" "main" {
  name        = "weathergov-${var.env}-private"
  description = "Private subnets for weathergov-${var.env}"
  subnet_ids  = data.aws_subnets.private.ids

  tags = {
    "noaa:subcomponent" = "database"
  }
}

resource "aws_security_group" "rds" {
  name        = "weathergov-${var.env}-rds"
  description = "Postgres access for weathergov-${var.env}-rds"
  vpc_id      = data.aws_vpc.main.id

  tags = {
    "noaa:subcomponent" = "database"
  }
}

# for now, allow anything in the VPC to access RDS
resource "aws_vpc_security_group_ingress_rule" "postgres" {
  security_group_id = aws_security_group.rds.id
  description       = "Postgres from within the VPC"
  cidr_ipv4         = data.aws_vpc.main.cidr_block
  from_port         = 5432
  to_port           = 5432
  ip_protocol       = "tcp"

  tags = {
    "noaa:subcomponent" = "database"
  }
}

resource "aws_db_instance" "main" {
  identifier     = "weathergov-${var.env}-rds"
  engine         = "postgres"
  engine_version = var.database_engine_version
  instance_class = var.database_instance_class

  db_name  = var.database_name
  username = var.database_username

  allocated_storage = var.database_allocated_storage
  storage_type      = "gp3"

  # multi AZ by default
  multi_az = true

  # use terraform state instead.
  # manage_master_user_password = true
  password = random_password.db_master.result
  # encrypt by default
  storage_encrypted = true
  # this RDS is not accessible from outside
  publicly_accessible = false
  # bump up minor versions automatically
  auto_minor_version_upgrade = true
  # copy instance tags to snapshots as well
  copy_tags_to_snapshot = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  tags = {
    "noaa:subcomponent" = "database"
  }
}
