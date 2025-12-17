#!/bin/bash

# Skill Wallet - AWS EC2 Setup Script
# Run this script on your Amazon Linux 2023 or Ubuntu instance.

# 1. Update and Install Docker
echo "Installing Docker..."
if [ -f /etc/os-release ]; then
    . /etc/os-release
    if [[ "$ID" == "amzn" ]]; then
        sudo yum update -y
        sudo yum install -y docker git
        sudo service docker start
        sudo usermod -a -G docker ec2-user
        # Install Docker Compose plugin
        sudo mkdir -p /usr/local/lib/docker/cli-plugins
        sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose
        sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
    else
        # Assume Ubuntu/Debian
        sudo apt-get update
        sudo apt-get install -y docker.io docker-compose-plugin git
        sudo usermod -aG docker $USER
    fi
fi

# 2. Clone Repository
echo "Cloning repository..."
if [ -d "SkillWalletProject" ]; then
    echo "Repository already exists. Pulling latest..."
    cd SkillWalletProject
    git pull origin main
else
    git clone https://github.com/anusmitasen2005-lgtm/SkillWalletProject.git
    cd SkillWalletProject
fi

# 3. Get Public IP
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com)
echo "Detected Public IP: $PUBLIC_IP"

# 4. Create .env file if not exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
fi

# 5. Build and Run
echo "Building and starting containers..."
echo "Setting VITE_API_BASE_URL to http://$PUBLIC_IP:8000/api/v1"

# Export the variable so Docker Compose picks it up
export VITE_API_BASE_URL="http://$PUBLIC_IP:8000/api/v1"

# Force rebuild of frontend to bake in the IP
sudo docker compose build frontend
sudo docker compose up -d

echo "==========================================================="
echo "Deployment Complete!"
echo "Frontend: http://$PUBLIC_IP"
echo "Backend:  http://$PUBLIC_IP:8000/docs"
echo "==========================================================="
