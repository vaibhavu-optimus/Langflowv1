# Custom App Deployment

## Deploying on Your VPS

This application is designed to be deployed using Docker on a VPS. The setup includes a web application with frontend and backend components, a database, and various supporting services.

### Prerequisites

- Docker and Docker Compose installed on your VPS
- A domain name pointing to your VPS
- Port 80 and 443 open on your VPS

### Deployment Steps

1. Clone your repository on your VPS:
```bash
git clone https://github.com/yourusername/your-custom-app-name.git
cd your-custom-app-name/deploy
```

2. Create an `.env` file based on the provided template:
```bash
cp .env.example .env
```

3. Edit the `.env` file with your specific configurations:
```bash
nano .env
```
Be sure to update at minimum:
- DOMAIN (your domain name)
- STACK_NAME (your custom stack name)
- All passwords (POSTGRES_PASSWORD, RABBITMQ_DEFAULT_PASS, etc.)

4. Build and start the services:
```bash
docker-compose -f custom-docker-compose.yml build
docker-compose -f custom-docker-compose.yml up -d
```

5. Initialize the database (first time only):
```bash
docker-compose -f custom-docker-compose.yml exec backend python -m app db init
```

6. Create a superuser if needed:
```bash
docker-compose -f custom-docker-compose.yml exec backend python -m app db create-user
```

### Accessing Your Application

After deployment, you can access:
- Main application: https://your-domain.com
- API documentation: https://your-domain.com/docs
- PGAdmin (database management): https://pgadmin.your-domain.com
- Flower (task monitoring): https://flower.your-domain.com

### Troubleshooting

If you encounter any issues:
1. Check the logs for any service:
```bash
docker-compose -f custom-docker-compose.yml logs backend
```

2. Restart a specific service:
```bash
docker-compose -f custom-docker-compose.yml restart backend
```

3. Restart the entire stack:
```bash
docker-compose -f custom-docker-compose.yml down
docker-compose -f custom-docker-compose.yml up -d
```

### Updating Your Application

To update your application to a new version:
```bash
git pull
docker-compose -f custom-docker-compose.yml down
docker-compose -f custom-docker-compose.yml build
docker-compose -f custom-docker-compose.yml up -d
``` 