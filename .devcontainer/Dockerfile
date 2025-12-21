FROM mcr.microsoft.com/devcontainers/javascript-node:1-20-bullseye

# Install R
# We use apt-get to install R.
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends r-base \
    && R -e "install.packages('simstudy', repos='http://cran.rstudio.com/')"

# Install Deno
ENV DENO_INSTALL=/usr/local
RUN curl -fsSL https://deno.land/x/install/install.sh | sh

# Verify installations
RUN node --version && deno --version && R --version
