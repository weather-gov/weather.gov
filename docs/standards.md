# Project review standards

### Branching strategy

### Pull request process

We use pull requests (PR) to merge new code into the project. PRs give us an
opportunity to apply automated tests and human reviews of changes before they
are accepted into our main branch to be released. Anyone may create a PR at any
time. The process for reviewing PRs is outlined here.

1. Open a pull request.

   - If the PR is not yet ready for review, open it as a draft PR and stop here
     until it is ready.

2. Assign the product, design, and engineering leads as reviewers, as
   appropriate.

   - The area leads will scan the PR to determine who should review it. They may
     also review it themselves.

   - If you know who needs to review your PR needs, feel free to assign those
     people directly instead of assigning the leads.

3. If the review needs a meeting or discussion time, add it to the
   [discussion topics](https://docs.google.com/spreadsheets/d/1wd9WsmNHdLXl-smL_A63oBDRIkALJTELXcITl4iTdMs/edit#gid=1456748459)
   and we'll pick it up at the end of a standup. If it lingers more than a
   couple of days, ping an area lead.

4. If reviewers have questions or see things that need to be fixed or changed,
   they should leave those questions or comments in the review. Do not mark the
   PR as "approved" unless you really mean it.

   - It is okay to mark a PR as approved if you only want a small change or have
     a minor question and don't want the PR author to have to wait for you to
     review it again later. We are allowed to trust each other if we want to.
     But for bigger changes, mark the PR as "changes requested" or "comment."

   - If a PR uncovers work _outside the scope of the PR_ that needs to be done,
     document that with new issues. Refer to the PR in the new issue.

     - If the new work is technical debt or a bug, place it directly into the
       backlog instead of the project inbox and label it accordingly.

5. When all requested reviewers have approved a PR (and the required automated
   checks have completed successfully), it can be merged. We merge using the
   squash+rebase strategy in GitHub.

   - The GitHub behavior is something like this:

     ```sh
     git checkout <branch>
     git rebase -i main # Picks the first commit, squashes the rest.
     git checkout main
     git merge <branch>
     git push
     ```

     > [!NOTE]  
     > You cannot actually do it manually in our repo as the `main` branch does
     > not allow remote pushes.

#### Branch protections

### Merging strategy

### Deployment strategy
