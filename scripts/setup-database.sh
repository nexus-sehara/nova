#!/bin/bash

# Script to set up a PostgreSQL database using Docker for local development
# This script requires Docker to be installed and running

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Nova App Database Setup${NC}"
echo -e "This script will set up a PostgreSQL database using Docker for your development environment."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
  echo -e "${RED}Error: Docker is not installed. Please install Docker first.${NC}"
  echo -e "Visit https://docs.docker.com/get-docker/ for installation instructions."
  exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
  echo -e "${RED}Error: Docker is not running. Please start Docker daemon.${NC}"
  exit 1
fi

# Default values
DB_NAME="nova_db"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_PORT="5432"
CONTAINER_NAME="nova-postgres"

# Check if container already exists
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo -e "${YELLOW}A container named '${CONTAINER_NAME}' already exists.${NC}"
  read -p "Do you want to remove it and create a new one? [y/N] " REMOVE_CONTAINER
  
  if [[ "$REMOVE_CONTAINER" =~ ^[Yy]$ ]]; then
    echo -e "Stopping and removing existing container..."
    docker stop ${CONTAINER_NAME} &> /dev/null
    docker rm ${CONTAINER_NAME} &> /dev/null
  else
    echo -e "Keeping existing container. If it's not running, start it with:"
    echo -e "  ${YELLOW}docker start ${CONTAINER_NAME}${NC}"
    exit 0
  fi
fi

echo -e "\n${YELLOW}Starting PostgreSQL container...${NC}"
docker run --name ${CONTAINER_NAME} \
  -e POSTGRES_PASSWORD=${DB_PASSWORD} \
  -e POSTGRES_USER=${DB_USER} \
  -e POSTGRES_DB=${DB_NAME} \
  -p ${DB_PORT}:5432 \
  -d postgres:14

if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to start PostgreSQL container.${NC}"
  exit 1
fi

echo -e "${GREEN}PostgreSQL container started successfully!${NC}"
echo -e "Container name: ${YELLOW}${CONTAINER_NAME}${NC}"
echo -e "Database name: ${YELLOW}${DB_NAME}${NC}"
echo -e "Username: ${YELLOW}${DB_USER}${NC}"
echo -e "Password: ${YELLOW}${DB_PASSWORD}${NC}"
echo -e "Port: ${YELLOW}${DB_PORT}${NC}"
echo -e "Connection URL: ${YELLOW}postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}${NC}"

echo -e "\n${YELLOW}Waiting for PostgreSQL to start up...${NC}"
sleep 5

# Check if Prisma CLI is installed
if ! command -v npx prisma &> /dev/null; then
  echo -e "\n${YELLOW}Prisma CLI not found in path. Installing Prisma dependencies...${NC}"
  npm install @prisma/client prisma
fi

# Set DATABASE_URL in .env file
echo -e "\n${YELLOW}Updating .env file with database connection...${NC}"
if [ -f .env ]; then
  # If .env exists, update or add DATABASE_URL
  if grep -q "DATABASE_URL" .env; then
    # Update existing DATABASE_URL
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}\"|" .env
  else
    # Add DATABASE_URL if it doesn't exist
    echo "DATABASE_URL=\"postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}\"" >> .env
  fi
else
  # Create .env file with DATABASE_URL
  echo "DATABASE_URL=\"postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}\"" > .env
fi

echo -e "\n${YELLOW}Running Prisma migrations...${NC}"
npx prisma migrate dev --name initial

echo -e "\n${GREEN}Database setup complete!${NC}"
echo -e "You can now run your application with the proper database connection."
echo -e "To stop the database container, run: ${YELLOW}docker stop ${CONTAINER_NAME}${NC}"
echo -e "To start it again later, run: ${YELLOW}docker start ${CONTAINER_NAME}${NC}" 