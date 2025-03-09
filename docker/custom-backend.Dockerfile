FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim
ENV TZ=UTC
ENV PYTHONPATH=/app

WORKDIR /app

RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y \
    build-essential \
    curl \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY . /app

# Try to install the langflow package in development mode from source
WORKDIR /app/src/backend/base
RUN pip install -e . || echo "Failed to install from source, will try PyPI"

# As a fallback, also install langflow from PyPI
RUN pip install langflow

# Install dependencies using uv
WORKDIR /app
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=README.md,target=README.md \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    --mount=type=bind,source=src/backend/base/README.md,target=src/backend/base/README.md \
    --mount=type=bind,source=src/backend/base/uv.lock,target=src/backend/base/uv.lock \
    --mount=type=bind,source=src/backend/base/pyproject.toml,target=src/backend/base/pyproject.toml \
    uv sync --frozen --no-install-project --no-dev

# Install specific versions of Celery, Flower, Redis and Uvicorn to fix the async issues and missing uvicorn
RUN pip install celery==5.3.6 flower==2.0.1 redis==5.0.1 aioredis==2.0.1 uvicorn==0.27.1

EXPOSE 7860

CMD ["uvicorn", "--host", "0.0.0.0", "--port", "7860", "--factory", "langflow.main:create_app"]