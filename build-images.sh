#!/bin/bash
set -e

# Enable BuildKit for Docker
export DOCKER_BUILDKIT=1

echo "Building backend image..."
docker build -t langflow-backend:latest -f docker/custom-backend.Dockerfile .

echo "Building frontend image..."
docker build -t langflow-frontend:latest -f docker/custom-frontend.Dockerfile .

echo "Images built successfully!"
echo "You can now run: docker-compose -f deploy/image-docker-compose.yml up -d" 