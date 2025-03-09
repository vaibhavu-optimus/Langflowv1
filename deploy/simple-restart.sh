#!/bin/bash

# Change to the deploy directory where the docker-compose file is located
cd $(dirname "$0")

echo "=== BYPASSING AUTHENTICATION ==="
echo "We've modified the frontend to automatically log in without requiring backend authentication."
echo "This allows you to use Langflow without dealing with signup/login issues."
echo ""

# Stop and remove all existing containers
echo "Stopping and removing existing containers..."
docker compose -f custom-docker-compose.yml down

# Clean up any lingering networks
echo "Cleaning up networks..."
docker network prune -f

# Rebuild images with the latest code changes
echo "Building images with your code changes..."
docker compose -f custom-docker-compose.yml build

# Start the services
echo "Starting the services..."
docker compose -f custom-docker-compose.yml up -d

# Wait a moment for services to initialize
echo "Waiting for services to start..."
sleep 10

# Show the running containers
echo "Running containers:"
docker compose -f custom-docker-compose.yml ps

# Check logs for any immediate errors
echo ""
echo "Checking for errors in backend logs..."
docker compose -f custom-docker-compose.yml logs backend --tail 20

# Test network connectivity
echo ""
echo "Testing network connectivity..."
echo "Backend connectivity test:"
docker exec deploy-backend-1 curl -v --max-time 5 http://localhost:7860/api/v1/health || echo "Backend self-test failed"
echo ""
echo "Network interfaces and listening ports:"
ip addr show
echo ""
echo "Listening ports:"
netstat -tulpn | grep LISTEN

echo ""
echo "Langflow should be accessible at:"
echo "  - Frontend URL: http://94.72.120.28:8090"
echo "  - You will be AUTOMATICALLY LOGGED IN - no need for signup/login"
echo "  - Backend API: http://94.72.120.28:7860"
echo "  - Flower monitoring: http://94.72.120.28:5555"
echo "  - PGAdmin: http://94.72.120.28:5050"
echo ""
echo "If you cannot connect, check if your hosting provider has a firewall blocking these ports"
echo ""
echo "You can check the logs with: docker compose -f custom-docker-compose.yml logs -f [service_name]" 