# DigitalOcean Deployment Guide

This guide explains how to set up your DigitalOcean Droplet and configure automated deployments using GitHub Actions.

## 1. Initial Server Setup

1.  **Create Droplet**:
    *   **Image**: Docker on Ubuntu (DigitalOcean Marketplace) OR standard Ubuntu 22.04.
    *   **Plan**: Basic ($6/mo is fine to start).
    *   **Auth**: SSH Key (Select your local public key).

2.  **Access Server**:
    ```bash
    ssh root@<your_droplet_ip>
    ```

3.  **Install Docker (if using standard Ubuntu)**:
    *   Follow [official Docker install guide](https://docs.docker.com/engine/install/ubuntu/), OR
    *   `snap install docker` (easiest on Ubuntu).

4.  **Clone Repository**:
    ```bash
    git clone https://github.com/YOUR_USERNAME/sim-site.git
    cd sim-site
    ```

5.  **First Manual Run** (to verify):
    ```bash
    docker compose up --build -d
    ```
    Visit `http://<your_droplet_ip>:3000`.

## 2. Automating Updates (GitHub Actions)

We have created `.github/workflows/deploy.yml`. For it to work, you need to add secrets to your GitHub repository.

1.  **Go to GitHub**: Settings > Secrets and variables > Actions.
2.  **Add New Repository Secrets**:

    *   `DO_HOST`: Your Droplet IP address (e.g., `123.45.67.89`).
    *   `DO_USERNAME`: `root` (or your user).
    *   `DO_SSH_KEY`: **Private Key** of an SSH key that has access to the Droplet.
        *   *Tip*: Generate a specific deploy key for this:
            ```bash
            ssh-keygen -t ed25519 -C "github-action" -f ./deploy_key
            cat deploy_key # Copy this content to DO_SSH_KEY
            cat deploy_key.pub # Add this content to ~/.ssh/authorized_keys on the Droplet
            ```

## 3. How it Works

1.  You push code to `main`.
2.  GitHub Action logs into your Droplet via SSH.
3.  It runs:
    *   `git pull` (updates code)
    *   `docker compose up --build -d` (rebuilds and restarts containers)

## Troubleshooting

-   **Permission Denied**: Check that the public key of the key pair in `DO_SSH_KEY` is actually in `~/.ssh/authorized_keys` on the server.
-   **Env Vars**: If you have secrets in `.env`, you must create that file manually on the server (`nano .env`) as it is not committed to git.
