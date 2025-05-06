#!/bin/bash

# Script to automatically update GitHub repository
# Usage: ./scripts/auto-update-github.sh "Your commit message"

# Exit on any error
set -e

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if a commit message was provided
if [ -z "$1" ]; then
  echo -e "${RED}Error: Please provide a commit message${NC}"
  echo "Usage: ./scripts/auto-update-github.sh \"Your commit message\""
  exit 1
fi

COMMIT_MESSAGE="$1"

# Get current directory
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$DIR/.." && pwd)"

# Navigate to repository root
cd "$REPO_ROOT"

echo -e "\n${YELLOW}Starting GitHub auto-update process...${NC}"

# Check if git is initialized
if [ ! -d .git ]; then
  echo -e "${RED}Error: Not a git repository. Make sure you're in the correct directory.${NC}"
  exit 1
fi

# Check for remote origin
if ! git remote | grep -q "origin"; then
  echo -e "${RED}Error: No remote 'origin' found. Please set up a remote repository first:${NC}"
  echo "git remote add origin https://github.com/username/repo.git"
  exit 1
fi

# Pull the latest changes first to avoid conflicts
echo -e "\n${YELLOW}Pulling latest changes from remote repository...${NC}"
git pull origin "$(git branch --show-current)" || {
  echo -e "${RED}Failed to pull latest changes. You may need to resolve conflicts manually.${NC}"
  exit 1
}

# Check for changes
if git diff-index --quiet HEAD --; then
  echo -e "${YELLOW}No changes detected in the repository.${NC}"
  
  # Check for untracked files
  if [ -z "$(git ls-files --others --exclude-standard)" ]; then
    echo -e "${YELLOW}No untracked files found. Nothing to commit.${NC}"
    exit 0
  else
    echo -e "${YELLOW}Untracked files found. Adding all untracked files...${NC}"
  fi
fi

# Add all changes
echo -e "\n${YELLOW}Adding all changes to git...${NC}"
git add --all

# Commit changes
echo -e "\n${YELLOW}Committing changes with message: ${NC}\"$COMMIT_MESSAGE\""
git commit -m "$COMMIT_MESSAGE"

# Push to remote
echo -e "\n${YELLOW}Pushing changes to remote repository...${NC}"
git push origin "$(git branch --show-current)" || {
  echo -e "${RED}Failed to push changes. The remote branch may have new commits.${NC}"
  echo -e "${YELLOW}Trying to pull and rebase...${NC}"
  
  git pull --rebase origin "$(git branch --show-current)" || {
    echo -e "${RED}Failed to rebase. You need to resolve conflicts manually.${NC}"
    exit 1
  }
  
  echo -e "${YELLOW}Trying to push again after rebase...${NC}"
  git push origin "$(git branch --show-current)" || {
    echo -e "${RED}Failed to push again. Please check your repository status and try again.${NC}"
    exit 1
  }
}

echo -e "\n${GREEN}Successfully updated GitHub repository!${NC}"
echo -e "${YELLOW}Summary of changes:${NC}"
git show --stat HEAD

exit 0 