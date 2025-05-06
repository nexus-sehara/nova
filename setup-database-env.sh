#!/bin/bash

# Master script to set up both database and environment for Nova app

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                 ${YELLOW}Nova App Complete Setup${BLUE}                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo -e "${GREEN}This script will set up your entire Nova app environment:${NC}"
echo -e "  1. PostgreSQL database"
echo -e "  2. Environment variables"
echo -e "  3. Prisma migrations"
echo -e ""

# Check if scripts exist
if [ ! -f "./scripts/setup-database.sh" ] || [ ! -f "./scripts/setup-env.sh" ]; then
  echo -e "${RED}Error: Setup scripts are missing. Make sure you're in the root directory of the Nova app.${NC}"
  exit 1
fi

# Make sure scripts are executable
chmod +x ./scripts/setup-database.sh
chmod +x ./scripts/setup-env.sh

# Step 1: Set up database
echo -e "\n${YELLOW}Step 1: Setting up PostgreSQL database${NC}"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./scripts/setup-database.sh

# Check if the previous step was successful
if [ $? -ne 0 ]; then
  echo -e "\n${RED}Database setup failed. Would you like to continue with environment setup? [y/N]${NC}"
  read -p "" CONTINUE
  
  if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
    echo -e "${RED}Setup aborted.${NC}"
    exit 1
  fi
fi

# Step 2: Set up environment variables
echo -e "\n${YELLOW}Step 2: Setting up environment variables${NC}"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./scripts/setup-env.sh

# Step 3: Generate Prisma client
echo -e "\n${YELLOW}Step 3: Generating Prisma client${NC}"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npx prisma generate

echo -e "\n${GREEN}Setup Complete!${NC} 🎉"
echo -e "\nYou can now start your development server with:"
echo -e "  ${YELLOW}shopify app dev${NC}"

# Make script executable
chmod +x setup-database-env.sh 