# Utility Scripts

This directory contains useful scripts for managing the Nova App project.

## Auto-Update GitHub Repository

The `auto-update-github.sh` script automates the process of committing and pushing changes to your GitHub repository.

### Usage

```bash
./scripts/auto-update-github.sh "Your commit message"
```

### Features

- Automatically pulls the latest changes to prevent conflicts
- Adds all new and modified files to git
- Commits changes with your provided message
- Pushes to the current branch on the remote repository
- Handles common errors like merge conflicts with clear error messages
- Attempts to rebase and retry if the push fails due to remote changes

### Example

```bash
./scripts/auto-update-github.sh "Fixed CORS issues in pixel API"
```

### Requirements

- Git must be installed and configured
- A remote repository named 'origin' must be set up
- You must have sufficient permissions to push to the remote repository

## GitHub Actions Workflow

This project also includes a GitHub Actions workflow in `.github/workflows/auto-update.yml` that can:

1. Run automatically on a daily schedule
2. Run when changes are pushed to the main branch
3. Run when pull requests are created against the main branch
4. Be triggered manually from the GitHub Actions tab

The workflow performs automated testing, building, and can commit any generated changes back to the repository. 