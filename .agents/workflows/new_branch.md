---
name: new_branch
description: Automates stashing current changes, checking out main, pulling the latest code, and switching to a new branch.
arguments:
  - name: branch_name
    description: The name of the new branch to switch to
    required: true
---

# New Branch Workflow

This workflow automates the process of setting up a new git branch from the latest production code.

## Steps

1. **Stash current changes**:
   Run `git stash` to stash any local uncommitted changes.

2. **Check out the main branch**:
   Run `git checkout main` to switch to the production main branch.

3. **Pull latest changes**:
   Run `git pull` to ensure the local main branch is up-to-date.

4. **Switch to new branch**:
   Run `git checkout -b {{args.[0]}}` to create and switch to the new branch.
