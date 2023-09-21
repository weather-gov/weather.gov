# Quality Assurance Surveillance Plan

A Quality Assurance Surveillance Plan (QASP; "kwasp") is a government
procurement tool that lays out the government's expectations for performance and
deliverables throughout the lifetime of the contract. A QASP can act as a
leading indicator of performance problems and can help the government and vendor
resolve any issues before they escalate into something worse.

The weather.gov team has chosen to adopt the performance metrics and
expectations typically found in a QASP. This serves two broad purposes. First,
it helps us feel confident that we are delivering a high-quality, maintainable,
secure product. Second, it helps ensure that future development teams will
inherit a code base that already meets the National Weather Service's
performance quality expectations. Rather than make a product compliant, future
teams will only need to _maintain_ compliance.

The elements in this QASP will be reviewed with every change committed to this
repository. Some elements must be manually checked while others may be
automated. An element is considered satisfactory if the automated checks are
a) relevant and b) pass.

> [!NOTE]  
> The implementation details of how we will uphold the following standards will
> be documented elsewhere. As this is an iterative process, we do not expect to
> satisfy all of the required standards immediately. In fact, we will not even
> attempt to measure them all from the start.

## Elements

### 1. Code is tested

As part of a robust software development practice, the development team will
ensure that code is working properly. Testing provides feedback to developers
in real time, reduces the risk of breaking changes or errors in production,
and provides a rough metric to non-technical stakeholders of code quality.

The acceptable standards for this element are:

- Code accepted into the main product branch has at least 90% code test
  coverage, and all tests are reviewed for relevance and correctness
- Tests run automatically before code is deployed, with results available to all
  members of the team
- Tests simulate variation in data without using production data
- Tests simulate the conditions of the production environment

### 2. Code is properly styled and well-structured

For maintainability and predictability, the development team will ensure that
code uses a consistent and thoughtful style. This produces a more maintainable
product by allowing developers to work more easliy on unfamiliar code and
reducing the risks of surprise complexity.

This assessment includes activities like:

- Code linting
- Static analysis and complexity checks
- Code documentation reviews

The acceptable standards for this element are:

- Code is properly styled according to an industry-standard style guide
- Code is well-structured for maintaininability and sustainability
- Code includes robust code comments to explain and document the code
- Code styles and structure is assessed automatically, with results available
  to all members of the team

### 3. Product is accessible for all users

Users will be able to use the product easily with temporarily or permanent
disabilities. Section 508 provides minimum standards, and Web Content
Accessibility Guidelines 2.1 AA standards supply best practices beyond those.

The acceptable standards for this element are:

- Accessibility is ensured throughout development
- Accessibility of machine-readable elements is assessed automatically, with
  results available to all members of the team

### 4. Deployment is simple

Code should be deployed frequently and doing so should be an automated process.
Deploying to production should be a minor event. With the recognition that even
the best-laid plans go awry, rolling back to previous versions should be
simple and fast.

The acceptable standards for this element are:

- Code successfully builds and deploys into a non-production environment
  preceding any deployment to production
- Code can be quickly deployed to any environment with a single brief,
  well-documented process
- Deployment to a production environment requires passing tests
- Releases can be rolled back quickly and easily

### 5. Code and development processes are documented

Clear, usable documentation is critical to the success of this work. Having a
collaborative plan for creating, updating, and assessing documentation is an
important part of this work. Specific documentation types may include:

- System documentation, including all eleemnts require by security compliance
  processes
- Software development documentation, including installation and instructions
  for use
- Process documentation for any repeated processes, such as software deployments

As a general guide, any work that is tracked should be documented in some form.

The acceptable standards for this element are:

- Documentation is up-to-date and is directly accessible to all members of the
  team
- Process documentation is easily usable by new team members
- Code documentation includes all major functionality in the source code
- Code documentation accords with the code styling guide

### 6. Product is free of known vulnerabilities

Development will follow best practices for application security. Particular
care will be taken to tackle security features in the development process,
rather than attempting to add them in later.

The acceptable standards for this element are:

- Code is free of known vulnerabilities
- Code is automatically checked for known vulnerabilities, both when it is first
  committed and also on an ongoing basis

### 7. Product is compliant

The product will have oversight from NWS's security team, but it is primarily
responsible for ensuring compliance with federal requirements and standards.
The team is encouraged to take a proactive approach to compliance requirements
by working collaboratively with the NWS ACIO office to avoid unexpected dealys.

Compliance standards may include:

- NIST 800-53 for security controls
- Section 508 for accessibility
- 21st Century IDEA Act for development standards

The acceptable standards for this element are:

- Compliance tasks are prioritized within the product backlog
- System is positioned to pass audits

### 8. User research informs software development

The work backlog is built from actual user needs. To do this, the team will
continue to build on the existing user research throughout the project, and that
research should be cumulative as the project progresses. For these purposes,
“user” is defined broadly and may include anybody who interacts with the system.

The acceptable standards for this element are:

- User research is guided by a research plan
- Research artifacts are accessible to all members of the team

### 9. Code and artifacts are available to and accessible by NWS

The trust needed in a collaborative environment is supported by working in the
open and being transparent. NWS will have administrative rights to all tools
and locations of product outputs, which may include:

- Task tracking
- Custom code
- Infrastructure-related metrics and data (e.g., uptime, estimated costs)
- Hosting environments

The acceptable standards for this element are:

- Tools necessary for development and maintenances are accessible by NWS
- Code is available and usable by NWS
