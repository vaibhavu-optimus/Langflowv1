FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    netcat-openbsd \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy the code
COPY . /app/

# Install the backend
WORKDIR /app/base
RUN pip install -e .[deploy]

# Install Celery and Flower
RUN pip install celery flower redis

# Return to the main directory
WORKDIR /app

EXPOSE 7860

# Start the application
CMD ["uvicorn", "--host", "0.0.0.0", "--port", "7860", "--factory", "langflow.main:create_app"] 