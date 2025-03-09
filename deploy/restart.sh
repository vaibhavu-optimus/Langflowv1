#!/bin/bash

# Stop and remove all existing containers
echo "Stopping and removing existing containers..."
docker compose -f custom-docker-compose.yml down

# Create the traefik-public network if it doesn't exist
echo "Creating traefik-public network..."
docker network create traefik-public || true

# Rebuild images with the latest code changes
echo "Building images with your code changes..."
docker compose -f custom-docker-compose.yml build

# Start the services
echo "Starting the services..."
docker compose -f custom-docker-compose.yml up -d

# Show the running containers
echo "Running containers:"
docker compose -f custom-docker-compose.yml ps

echo "Langflow should be accessible at http://94.72.120.28 once the services are started."
echo "You can check the logs with: docker compose -f custom-docker-compose.yml logs -f" 