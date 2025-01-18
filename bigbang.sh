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
if [ "$OS" = "Darwin" ]; then
    # Check if Homebrew is installed
    if ! command_exists brew; then
        log "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi

    # Install dependencies using Homebrew
    log "Installing dependencies using Homebrew..."

    if ! command_exists git; then
        log "Installing Git..."
        brew install git
    fi

    if ! command_exists node; then
        log "Installing Node.js and npm..."
        brew install node
    fi

    if ! command_exists docker; then
        log "Installing Docker..."
        brew install --cask docker
        log "Please open Docker Desktop to complete the installation"
    fi

elif [ "$OS" = "Linux" ]; then
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
else
    log "Unsupported operating system: $OS"
    exit 1
fi

# Install Pulumi if not present
if ! command_exists pulumi; then
    log "Installing Pulumi..."
    curl -fsSL https://get.pulumi.com | sh

    # Add Pulumi to PATH
    if [ "$OS" = "Darwin" ]; then
        echo 'export PATH=$PATH:$HOME/.pulumi/bin' >> ~/.zshrc
        source ~/.zshrc
    else
        echo 'export PATH=$PATH:$HOME/.pulumi/bin' >> /home/$SUDO_USER/.bashrc
    fi
fi

# Clone the repository if it doesn't exist
REPO_DIR="$HOME/pulumi-k8s-websocket"
if [ ! -d "$REPO_DIR" ]; then
    log "Cloning repository..."
    git clone https://github.com/miguelemosreverte/pulumi-k8s-websocket "$REPO_DIR"
else
    log "Repository already exists, pulling latest changes..."
    cd "$REPO_DIR" && git pull
fi

# Configure Pulumi token if pulumi.token.txt exists
PULUMI_TOKEN_FILE="$REPO_DIR/pulumi.token.txt"
if [ -f "$PULUMI_TOKEN_FILE" ]; then
    log "Configuring Pulumi token..."
    PULUMI_TOKEN=$(cat "$PULUMI_TOKEN_FILE")
    pulumi login --non-interactive ${PULUMI_TOKEN}
else
    log "Warning: pulumi.token.txt not found. You'll need to login to Pulumi manually."
fi

# Initialize and select Pulumi stack
log "Configuring Pulumi stack..."
cd "$REPO_DIR"
npm install
(pulumi stack select gcloud 2>/dev/null || pulumi stack init gcloud)

log "Verifying installations..."
echo "Git version: $(git --version)"
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"
echo "Docker version: $(docker --version)"
echo "Pulumi version: $(pulumi version)"

if [ "$OS" = "Darwin" ]; then
    log "Setup complete! Make sure Docker Desktop is running before proceeding."
else
    log "Setup complete! Please log out and back in for group changes to take effect."
fi

log "You can now cd into $REPO_DIR and run 'pulumi up'"
