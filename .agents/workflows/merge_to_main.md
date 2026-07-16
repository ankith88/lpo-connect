---
name: merge_to_main
description: Safely merges the active development branch into main, pushes it to GitHub to trigger closing hooks for an issue argument, and returns the local environment cleanly back to main.
arguments:
  - name: issue_number
    description: The GitHub issue number to close
    required: true
---

# Merge to Main Workflow

This workflow automates the process of safely merging the current active development branch into `main`, creating a merge commit that references and closes the specified issue on GitHub, pushing the changes to the remote repository, and returning the local environment back to `main`.

## Steps

1. **Identify the current branch**:
   Note the name of the active development branch (e.g., run `git branch --show-current`). Let's refer to it as `<branch_name>`.

2. **Checkout main**:
   Run `git checkout main` to switch back to the main branch.

3. **Pull latest changes**:
   Run `git pull` to ensure your local `main` branch has the latest remote updates.

4. **Merge the development branch**:
   Run `git merge <branch_name> --no-ff -m "Merge branch '<branch_name>' (closes #{{args.[0]}})"` to merge the branch and create a commit that triggers the GitHub issue closing hook.

5. **Push changes upstream**:
   Run `git push` to push the merged `main` branch and trigger the closing of the issue on GitHub.
