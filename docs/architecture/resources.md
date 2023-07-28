Our current deployment environment is the WOC, which is AWS under the hood. Here
are the AWS resources we're currently using:

- ECS
  - **Task** A task defines a container image and container configuration. For
    us, we're using the `drupal:10-apache` image running in an environment with
    1 vCPU and 3GB of memory. The container's port 80 is mapped out to the
    service. The task is configured to mount an EFS volume into the
    `/opt/drupal/web/sites/default` directory in the container so we can
    control/persist our `settings.php`.
  - **Service** A service specifies a task to be run and handles scaling it. We
    currently specify a minimum of 1 running task and a maximum of two with no
    scaling. Scaling can be configured based on the performance characteristics
    of a the tasks, so for example, we could create a new task instance whenever
    the cumulative CPU usage of the service reaches 70%, effectively adding a
    new CPU at each step. Then we can have it scale back down as CPU usage
    drops.
  - **Cluster** This is the container for ECS services. A cluster can host
    multiple services. Eventually we might have more than one service, but for
    getting started, we just have a single service that manages multiple
    instances of Drupal.
- EC2
  - **Management box (temp)** A simple EC2 instance that sits in the same VPC as
    our ECS stuff. It only exists so that we can use AWS "connect" tools to get
    shell access inside the VPC network and check connections between services.
    It functions similarly to a jump box. This box can also mount the EFS volume
    so we can view, edit, or create files that end up mounted in the container.
  - **Target group** A target group is part of a load balancer - you tell it
    where traffic should be sent. It's like... half of the functionality of a
    load balancer. I do not understand why it is separate from the load
    balancer. Maybe sometimes you reuse a target group in multiple load
    balancers? I dunno.
  - **ALB** The load balancer that catches HTTP requests on port 80 and sends
    them to our target group, which just forwards them on to our ECS cluster.
    The ECS cluster handles distributing it onwards from there.
  - **Security group** We need to do a better job of defining our security
    groups. Probably one per service. Right now they share a security group that
    permits all outbound traffic and all inbound traffic from within the VPC.
    The latter rule is what makes the management box work. Instead of everything
    sharing a security group, each service should get its own so we can tweak it
    to the narrowest set of permissions that work.
- EFS
  - **File system** A basic EFS filesystem. It's encrypted at rest. It has an
    attached policy that allows mounting, reading, and writing. This will almost
    certainly need to be revisited to tighten up the policy. It's attached to a
    security group that allows NFS traffic to/from all hosts.
  - **Access point** For now, there is only a single access point for mounting
    the `sites/default` directory where `settings.php` and other
    install-specific files live. This access point is helpful because it
    simplifies the process of mounting it into containers. It also sets up file
    permissions with POSIX user 33, the default for the `www-data` user that
    Drupal and Apache rely on.
- RDS
  - **Aurora MySQL instance** Nothing more to add. I started with a relatively
    small database so we may need to scale it up at some point. I _think_
    changing the database to a larger class is straightforward when using an
    Aurora engine.
