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

# Check if script is run with sudo
if [ "$EUID" -ne 0 ]; then
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
    log "Node.js version: $(node --version)"
    log "npm version: $(npm --version)"
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

    # Start Docker service
    systemctl start docker
    systemctl enable docker

    # Add current user to docker group
    usermod -aG docker $SUDO_USER
    log "Docker installed and configured"
fi

# Install Pulumi if not present
if ! command_exists pulumi; then
    log "Installing Pulumi..."
    curl -fsSL https://get.pulumi.com | sh

    # Add Pulumi to PATH for current session
    export PATH=$PATH:$HOME/.pulumi/bin

    # Add Pulumi to PATH permanently
    echo 'export PATH=$PATH:$HOME/.pulumi/bin' >> /home/$SUDO_USER/.bashrc
fi

# Configure Docker permissions
log "Configuring Docker permissions..."
if [ -S /var/run/docker.sock ]; then
    chmod 666 /var/run/docker.sock
fi

# Verify installations
log "Verifying installations..."
echo "Git version: $(git --version)"
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"
echo "Docker version: $(docker --version)"
echo "Pulumi version: $(pulumi version)"

log "Setup complete! Please log out and back in for group changes to take effect."
