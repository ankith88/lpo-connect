---
name: close_issue
description: Parses an issue number and a custom description, automatically appends 'closes #[number]' to the commit message to link and resolve it on GitHub, stages all modified changes, commits them cleanly, and pushes the active local branch upstream.
arguments:
  - name: issue_number
    description: The GitHub issue number to close
    required: true
  - name: commit_description
    description: Custom description for the commit message
    required: true
---

# Close Issue Workflow

This workflow automates the process of staging modifications, committing with a message linking/closing the specified issue, and pushing the active branch.

## Steps

1. **Stage modified changes**:
   Run `git add -u` to stage all modified changes in the repository.

2. **Commit changes**:
   Run `git commit -m "{{args.[1]}} (closes #{{args.[0]}})"` to commit changes with a clean message linking to the GitHub issue.

3. **Push upstream**:
   Run `git push` to push the active local branch upstream.
