#!/bin/bash

# Script to set up environment variables for Nova app
# This script will create or update the .env file with necessary variables

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Nova App Environment Setup${NC}"
echo -e "This script will create or update your .env file with the necessary environment variables."

# Check if .env file exists
if [ -f .env ]; then
  echo -e "${YELLOW}Found existing .env file. Creating backup at .env.backup${NC}"
  cp .env .env.backup
fi

# Get database URL
echo -e "\n${YELLOW}Database Configuration:${NC}"
echo -e "Enter your PostgreSQL database URL, or press Enter to use the default:"
echo -e "(Default: postgresql://postgres:postgres@localhost:5432/nova_db)"
read -p "DATABASE_URL=" DB_URL

if [ -z "$DB_URL" ]; then
  DB_URL="postgresql://postgres:postgres@localhost:5432/nova_db"
fi

# Get Shopify API credentials
echo -e "\n${YELLOW}Shopify API Configuration:${NC}"
read -p "Enter your Shopify API Key (or press Enter to keep existing): " SHOPIFY_API_KEY
read -p "Enter your Shopify API Secret (or press Enter to keep existing): " SHOPIFY_API_SECRET
read -p "Enter your Shopify App URL (or press Enter for https://nova-ebgc.onrender.com): " SHOPIFY_APP_URL

if [ -z "$SHOPIFY_APP_URL" ]; then
  SHOPIFY_APP_URL="https://nova-ebgc.onrender.com"
fi

# Generate a random session secret if one doesn't exist
EXISTING_SECRET=$(grep -oP 'SESSION_SECRET=\K.*' .env 2>/dev/null || echo "")
if [ -z "$EXISTING_SECRET" ]; then
  SESSION_SECRET=$(openssl rand -base64 32)
else
  SESSION_SECRET=$EXISTING_SECRET
fi

# Create or update .env file
{
  echo "# Shopify App environment variables"
  if [ -n "$SHOPIFY_API_KEY" ]; then
    echo "SHOPIFY_API_KEY=$SHOPIFY_API_KEY"
  else
    # Preserve existing value or use placeholder
    EXISTING_KEY=$(grep -oP 'SHOPIFY_API_KEY=\K.*' .env 2>/dev/null || echo "your_api_key")
    echo "SHOPIFY_API_KEY=$EXISTING_KEY"
  fi

  if [ -n "$SHOPIFY_API_SECRET" ]; then
    echo "SHOPIFY_API_SECRET=$SHOPIFY_API_SECRET"
  else
    # Preserve existing value or use placeholder
    EXISTING_SECRET=$(grep -oP 'SHOPIFY_API_SECRET=\K.*' .env 2>/dev/null || echo "your_api_secret")
    echo "SHOPIFY_API_SECRET=$EXISTING_SECRET"
  fi

  echo "SHOPIFY_APP_URL=$SHOPIFY_APP_URL"
  echo "SCOPES=write_products,read_orders,write_customers"
  echo ""
  echo "# Database connection"
  echo "DATABASE_URL=\"$DB_URL\""
  echo ""
  echo "# Session secret for encrypting cookies"
  echo "SESSION_SECRET=$SESSION_SECRET"
  echo ""
  echo "# Optional: Set this in production"
  echo "# HOST=$SHOPIFY_APP_URL"
} > .env

echo -e "\n${GREEN}Environment variables have been set up successfully!${NC}"
echo -e "You can now run the following command to start your development server:"
echo -e "  ${YELLOW}shopify app dev${NC}"
echo ""
echo -e "${YELLOW}Note:${NC} If you're running in production, make sure to set up the proper DATABASE_URL for your production database."

# Make the script executable
chmod +x scripts/setup-env.sh 