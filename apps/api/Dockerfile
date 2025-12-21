FROM debian:bookworm-slim

# 1. Install Deno (Pinned to 2.5.6)
ENV DENO_VERSION=2.5.6
RUN apt-get update && apt-get install -y curl unzip \
  && curl -fsSL https://github.com/denoland/deno/releases/download/v${DENO_VERSION}/deno-x86_64-unknown-linux-gnu.zip -o deno.zip \
  && unzip deno.zip \
  && mv deno /usr/local/bin/deno \
  && rm deno.zip \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# 2. Install R (Pinned by Debian Bookworm stability)
# We use binaries, so no dev tools (r-base-dev) needed.
RUN apt-get update && apt-get install -y r-base ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# 3. Install R Packages (Pinned by P3M Snapshot 2024-12-01)
RUN R -e "install.packages('simstudy', repos='https://packagemanager.posit.co/cran/__linux__/bookworm/2024-12-01')"

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

# Run the API
CMD ["deno", "run", "--allow-net", "--allow-run", "main.ts"]
