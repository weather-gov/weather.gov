# We will use Just as a task runner

Date: 2025-09-18

### Status

Accepted

### Context

Previously, we have made extensive use of `make` and a large Makefile to run many of our dev tasks, like compiling CSS, linting, or running tests. `make` is a build system, however, not a task runner. It is capable of running tasks, but it has idiosyncracies that make it sub-par for that purpose. For example, it isn't strictly shell scripting, so anyone updating the Makefile has to work around `make`'s own language and rules. The Makefile has served us well, but it can be complicated to update.

### Decision

- We will use [Just](https://just.systems) as a task runner

### Consequences

- We will have to rewrite our Makefile as a Justfile
- We will be able to write our tasks as shell scripts
- We will have the flexibility to use a variety of shells, including Python and Node.js
- All developers will need to install Just
