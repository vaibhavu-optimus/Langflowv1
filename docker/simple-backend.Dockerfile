FROM python:3.10-slim

WORKDIR /app
ENV PYTHONPATH=/app

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

# Try to install the langflow package in development mode
WORKDIR /app/src/backend/base
RUN pip install -e . || echo "Failed to install from source, will try PyPI"

# Also install langflow from PyPI as a fallback
RUN pip install langflow

# Install additional packages with specific versions
RUN pip install celery==5.3.6 flower==2.0.1 redis==5.0.1 aioredis==2.0.1 uvicorn==0.27.1

# Return to the main directory
WORKDIR /app

EXPOSE 7860

# Start the application
CMD ["uvicorn", "--host", "0.0.0.0", "--port", "7860", "--factory", "langflow.main:create_app"] 