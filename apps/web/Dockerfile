FROM node:20-slim AS builder

WORKDIR /app

# 1. Install dependencies (Cached separately)
COPY apps/web/package.json apps/web/package-lock.json ./apps/web/
WORKDIR /app/apps/web
RUN npm install

# 2. Copy source code
WORKDIR /app
# Copy shared packages (required for alias resolution)
COPY packages/shared ./packages/shared
# Copy Web app source
COPY apps/web ./apps/web

WORKDIR /app/apps/web

# Increase memory limit for build (uses swap if needed)
ENV NODE_OPTIONS="--max_old_space_size=2048"

# Build the application
RUN npm run build

# Production Runner
FROM node:20-slim

WORKDIR /app

# Copy the build output
COPY --from=builder /app/apps/web/.output ./.output

# Expose port
EXPOSE 3000

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

# Run the server
CMD ["node", ".output/server/index.mjs"]
