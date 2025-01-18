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

# Detect OS
OS="$(uname)"
if [ "$OS" = "Linux" ]; then
    # Check if script is run with sudo on Linux
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

        systemctl start docker
        systemctl enable docker
        usermod -aG docker $SUDO_USER
    fi
fi

# Get the actual home directory of the sudo user
if [ -n "$SUDO_USER" ]; then
    USER_HOME=$(getent passwd "$SUDO_USER" | cut -d: -f6)
else
    USER_HOME="$HOME"
fi

# Install Pulumi if not present
if ! command_exists pulumi; then
    log "Installing Pulumi..."
    su - $SUDO_USER -c 'curl -fsSL https://get.pulumi.com | sh'

    # Add Pulumi to PATH in the user's bashrc
    echo 'export PATH=$PATH:$HOME/.pulumi/bin' >> $USER_HOME/.bashrc

    # Also add it to the current session
    export PATH=$PATH:$USER_HOME/.pulumi/bin
fi

# Clone the repository if it doesn't exist
REPO_DIR="$USER_HOME/pulumi-k8s-websocket"
if [ ! -d "$REPO_DIR" ]; then
    log "Cloning repository..."
    su - $SUDO_USER -c "git clone https://github.com/miguelemosreverte/pulumi-k8s-websocket $REPO_DIR"
else
    log "Repository already exists, pulling latest changes..."
    su - $SUDO_USER -c "cd $REPO_DIR && git pull"
fi

# Configure Pulumi token if pulumi.token.txt exists
PULUMI_TOKEN_FILE="$REPO_DIR/pulumi.token.txt"
if [ -f "$PULUMI_TOKEN_FILE" ]; then
    log "Configuring Pulumi token..."
    PULUMI_TOKEN=$(su - $SUDO_USER -c "cat $PULUMI_TOKEN_FILE")
    # Source the bashrc to ensure Pulumi is in the PATH
    su - $SUDO_USER -c "source ~/.bashrc && pulumi login --non-interactive ${PULUMI_TOKEN}"
else
    log "Warning: pulumi.token.txt not found. You'll need to login to Pulumi manually."
fi

# Initialize and select Pulumi stack
log "Configuring Pulumi stack..."
su - $SUDO_USER -c "cd $REPO_DIR && npm install"
su - $SUDO_USER -c "source ~/.bashrc && cd $REPO_DIR && (pulumi stack select gcloud 2>/dev/null || pulumi stack init gcloud)"

log "Verifying installations..."
echo "Git version: $(git --version)"
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"
echo "Docker version: $(docker --version)"
echo "Pulumi version: $(su - $SUDO_USER -c "source ~/.bashrc && pulumi version")"

log "Setup complete! Please log out and back in for group changes to take effect."
log "You can now cd into $REPO_DIR and run 'pulumi up'"
