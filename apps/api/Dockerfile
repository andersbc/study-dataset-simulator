FROM denoland/deno:debian-1.46.3

# Install R
RUN apt-get update && apt-get install -y r-base && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy shared packages (required for monorepo imports)
COPY packages/shared ./packages/shared

# Copy API app
COPY apps/api ./apps/api

WORKDIR /app/apps/api

# Expose port
EXPOSE 8000

# Run the API
# We allow net for API and run for R execution
CMD ["deno", "run", "--allow-net", "--allow-run", "main.ts"]
