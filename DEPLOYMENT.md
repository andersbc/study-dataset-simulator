# Deployment Guide

## Prerequisites
- Docker & Docker Compose
- User with UID 1000 (standard first user on Linux)

## Fresh Install (Production)

To create the necessary directories with correct permissions before starting:

```bash
mkdir -p data
```

Then start the application:

```bash
docker compose -f docker-compose.prod.yml up -d
```

## Fresh Install (Development)

Use the Deno task which handles setup automatically:

```bash
deno task dev:start
```
