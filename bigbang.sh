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

# Function to run command as user with proper PATH and environment
run_as_user() {
    # Create a script with all our environment variables and the command
    TMP_SCRIPT=$(mktemp)
    echo "#!/bin/bash" > $TMP_SCRIPT
    echo "export PATH=\$PATH:/home/$SUDO_USER/.pulumi/bin" >> $TMP_SCRIPT
    # Pass through the Pulumi token if it exists
    if [ -n "$PULUMI_ACCESS_TOKEN" ]; then
        echo "export PULUMI_ACCESS_TOKEN=$PULUMI_ACCESS_TOKEN" >> $TMP_SCRIPT
    fi
    echo "$1" >> $TMP_SCRIPT
    chmod +x $TMP_SCRIPT

    # Run the script as the user
    su - $SUDO_USER -c $TMP_SCRIPT
    rm $TMP_SCRIPT
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

# Configure Docker - This section has been significantly updated
log "Configuring Docker..."
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
fi

# Always ensure Docker is properly configured
log "Setting up Docker permissions..."
systemctl stop docker || true
groupadd -f docker
usermod -aG docker $SUDO_USER
rm -f /var/run/docker.sock
systemctl start docker
sleep 5  # Give Docker time to create the socket
chmod 666 /var/run/docker.sock
chown root:docker /var/run/docker.sock

# Test Docker as the user
if ! run_as_user "docker info" > /dev/null 2>&1; then
    log "WARNING: Initial Docker test failed, attempting fixes..."
    systemctl restart docker
    sleep 5
    chmod 666 /var/run/docker.sock

    if ! run_as_user "docker info" > /dev/null 2>&1; then
        log "ERROR: Docker is still not accessible to $SUDO_USER"
        log "Please try logging out and back in, then run: docker info"
        log "If that doesn't work, reboot the system"
        exit 1
    fi
fi

log "Docker is properly configured!"

# Install Pulumi if needed
if ! run_as_user "command -v pulumi" > /dev/null 2>&1; then
    log "Installing Pulumi..."
    run_as_user 'curl -fsSL https://get.pulumi.com | sh'

    # Add Pulumi to PATH in bashrc if not already there
    if ! grep -q "/.pulumi/bin" "/home/$SUDO_USER/.bashrc"; then
        echo 'export PATH=$PATH:$HOME/.pulumi/bin' >> "/home/$SUDO_USER/.bashrc"
    fi
fi

# Repository setup
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
    export PULUMI_ACCESS_TOKEN=$(run_as_user "cat $REPO_DIR/pulumi.token.txt")

    # Add token to bashrc if not already there
    if ! grep -q "PULUMI_ACCESS_TOKEN" "/home/$SUDO_USER/.bashrc"; then
        echo "export PULUMI_ACCESS_TOKEN=$PULUMI_ACCESS_TOKEN" >> "/home/$SUDO_USER/.bashrc"
    fi

    run_as_user "cd $REPO_DIR && npm install && (pulumi stack select gcloud 2>/dev/null || pulumi stack init gcloud)"
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
echo "Docker test: $(run_as_user "docker info >/dev/null 2>&1 && echo 'WORKING' || echo 'NOT WORKING'")"

log "Setup complete! Please run: source ~/.bashrc"
log "Then cd into $REPO_DIR and run 'pulumi up'"
