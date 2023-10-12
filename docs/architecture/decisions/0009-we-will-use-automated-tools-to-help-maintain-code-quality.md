# We will use automated tools to help maintain code quality

Date: 2023-10-10

### Status

Accepted

### Context

Maintainable code should be consistent, readable, functionally correct, and tested. Automated tools can help tremendously with all of these maintainability concerns.

### Decision

We will use the following tools:
- **PHP Code Beautifier and Fixer** () to automatically fix PHP code style issues. This tool will run on developer machines. It can be automated, but creates diverging git trees that can be a hassle for developers to manage.
- **PHP_CodeSniffer** () for PHP style checking, using the Drupal style guide

   > [!NOTE]  
   > NCO has a tool called  that we will look into. It includes two static analysis components as well.
   >
   > Also, NCO adopts the PSR1 and PSR2 style rules. This project had opted to adopt the Drupal style rules instead, since it is a Drupal project. We believe using the Drupal rules will make it easier to maintain in the long term.

- **PHPUnit** for unit testing PHP code.
- **eslint** for Javascript style checking, using the Airbnb style guide
- **prettier** to automatically fix Javascript and SCSS code style issues. This tool will run on developer machines. It can be automated, but creates diverging git trees that can be a hassle for developers to manage.


### Consequences

- We will have easier visibility into the quality of our code, and will have tools we can use to hold ourselves to a high standard.
- Developers may need a bit more time since they will need to format their code. This cost should decrease over time as everyone gets more familiar with the expected code styles.
- Code we write will be internally consistent and conform to well-known, widely-adopted code style standards.
- Our code will be easier for future teammates to pick up and start working with.
- Handoff between developers or teams will be lower risk since the inheriting team will receive well-formatted code along with automated tools to help enforce continued good development practices.
- This ADR does not address security or accessibility testing.
