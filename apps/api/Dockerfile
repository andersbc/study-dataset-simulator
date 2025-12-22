FROM ghcr.io/andersbc/study-dataset-simulator/api-base:latest

# Note: Deno, R, and R packages are already installed in the base image.

WORKDIR /app

# Copy configuration files
COPY deno.json deno.lock ./

# Copy shared packages (required for monorepo imports)
COPY packages/shared ./packages/shared

# Copy API app
COPY apps/api ./apps/api

WORKDIR /app/apps/api

# Expose port
EXPOSE 8000

# Set directory permissions for deno user
RUN chown -R deno:deno /app

# Switch to non-root user
USER deno

# Run the API
CMD ["deno", "run", "--allow-net", "--allow-run", "--allow-read", "--allow-write", "--allow-env", "main.ts"]
