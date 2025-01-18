#!/bin/bash

# Exit on any error
set -e

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to run command as user with proper PATH
run_as_user() {
    su - $SUDO_USER -c "export PATH=\$PATH:/home/$SUDO_USER/.pulumi/bin; $1"
}

# Check if running as root
if [ "$(id -u)" != "0" ]; then
    log "Please run as root (use sudo)"
    exit 1
fi

# Update package list
log "Updating package list..."
apt-get update

# Install Git if not present
if ! command_exists git; then
    log "Installing Git..."
    apt-get install -y git
fi

# Install Node.js and npm if not present
if ! command_exists node; then
    log "Installing Node.js and npm..."
    apt-get install -y nodejs npm
fi

# Install Docker if not present
if ! command_exists docker; then
    log "Installing Docker..."
    apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
        $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
        tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Ensure Docker is properly configured
    systemctl start docker || true
    systemctl enable docker || true

    # Create and configure Docker group
    groupadd -f docker
    usermod -aG docker $SUDO_USER

    # Fix permissions
    chmod 666 /var/run/docker.sock || true
    chown root:docker /var/run/docker.sock || true

    # Restart Docker daemon
    systemctl restart docker

    # Wait for Docker to be ready
    timeout=30
    while ! docker info >/dev/null 2>&1; do
        if [ "$timeout" -le 0 ]; then
            log "ERROR: Docker failed to start within timeout"
            exit 1
        fi
        timeout=$((timeout-1))
        sleep 1
    done

    # Verify Docker works
    if ! docker info >/dev/null 2>&1; then
        log "ERROR: Docker is not working properly"
        log "Please try: sudo chmod 666 /var/run/docker.sock"
        log "Then run: newgrp docker"
        exit 1
    fi
fi

# Install Pulumi if it's not in the user's path
if ! run_as_user "command -v pulumi" > /dev/null 2>&1; then
    log "Installing Pulumi..."
    run_as_user 'curl -fsSL https://get.pulumi.com | sh'

    # Add Pulumi to PATH in bashrc if not already there
    if ! grep -q "/.pulumi/bin" "/home/$SUDO_USER/.bashrc"; then
        echo 'export PATH=$PATH:$HOME/.pulumi/bin' >> "/home/$SUDO_USER/.bashrc"
    fi
fi

# Clone or update repository
REPO_DIR="/home/$SUDO_USER/pulumi-k8s-websocket"
if [ ! -d "$REPO_DIR" ]; then
    log "Cloning repository..."
    run_as_user "git clone https://github.com/miguelemosreverte/pulumi-k8s-websocket $REPO_DIR"
else
    log "Repository already exists, pulling latest changes..."
    run_as_user "cd $REPO_DIR && git pull"
fi

# Configure Pulumi token and stack
if [ -f "$REPO_DIR/pulumi.token.txt" ]; then
    log "Configuring Pulumi token..."
    # Read token and set as environment variable
    PULUMI_TOKEN=$(run_as_user "cat $REPO_DIR/pulumi.token.txt")
    run_as_user "export PULUMI_ACCESS_TOKEN=${PULUMI_TOKEN} && cd $REPO_DIR && npm install && (pulumi stack select gcloud 2>/dev/null || pulumi stack init gcloud)"

    # Configuration is now handled above with the token
else
    log "Warning: pulumi.token.txt not found. You'll need to login to Pulumi manually."
fi

# Verify installations
log "Verifying installations..."
echo "Git version: $(git --version)"
echo "Node version: $(run_as_user "node --version")"
echo "npm version: $(run_as_user "npm --version")"
echo "Docker version: $(docker --version)"
echo "Pulumi version: $(run_as_user "pulumi version")"

# Final Docker verification
if ! run_as_user "docker info" >/dev/null 2>&1; then
    log "WARNING: Docker is not working for user $SUDO_USER"
    log "Please run these commands manually:"
    log "1. sudo chmod 666 /var/run/docker.sock"
    log "2. newgrp docker"
    log "3. docker info"
fi

log "Setup complete! If Docker is not working, please log out and back in for group changes to take effect."
log "You can now cd into $REPO_DIR and run 'pulumi up'"
