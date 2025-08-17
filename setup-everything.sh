#!/bin/bash

# =============================================
# GIBBY CHAT - COMPLETE SETUP ON ONE SERVER
# =============================================

echo "🚀 Gibby Chat - Single Server Setup"
echo "This will install everything on THIS server"
echo ""

# Get user input
read -p "Enter your domain (or press Enter to use IP only): " DOMAIN
read -p "Enter your email for SSL certificate: " EMAIL
read -p "Enter your GitHub username: " GITHUB_USER
read -p "Enter your GitHub repo name (default: gibby-chat-next): " REPO_NAME
REPO_NAME=${REPO_NAME:-gibby-chat-next}

# Generate random password for database
DB_PASSWORD=$(openssl rand -base64 32)
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Update system
echo -e "${YELLOW}Updating system...${NC}"
apt update && apt upgrade -y

# Install Node.js 20
echo -e "${YELLOW}Installing Node.js...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git nginx postgresql postgresql-contrib certbot python3-certbot-nginx

# Install PM2
npm install -g pm2

# Setup PostgreSQL
echo -e "${YELLOW}Setting up PostgreSQL...${NC}"
sudo -u postgres psql << EOF
CREATE USER gibby WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE gibbychat OWNER gibby;
GRANT ALL PRIVILEGES ON DATABASE gibbychat TO gibby;
EOF

# Install Ollama
echo -e "${YELLOW}Installing Ollama...${NC}"
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama service
systemctl enable ollama
systemctl start ollama

# Pull AI models
echo -e "${YELLOW}Downloading AI models (this will take 5-10 minutes)...${NC}"
ollama pull llama3.2:3b

# Clone repository
echo -e "${YELLOW}Cloning your repository...${NC}"
cd /var/www
git clone https://github.com/$GITHUB_USER/$REPO_NAME.git
cd $REPO_NAME

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install

# Create .env file
echo -e "${YELLOW}Creating environment configuration...${NC}"
cat > .env << EOF
# Database
DATABASE_URL="postgresql://gibby:$DB_PASSWORD@localhost:5432/gibbychat"

# NextAuth
NEXTAUTH_URL=http://${DOMAIN:-$(curl -s ifconfig.me)}
NEXTAUTH_SECRET=$NEXTAUTH_SECRET

# Ollama (local)
OLLAMA_URL=http://localhost:11434
DEFAULT_MODEL=llama3.2:3b

# Environment
NODE_ENV=production
EOF

# Generate Prisma client and run migrations
echo -e "${YELLOW}Setting up database...${NC}"
npx prisma generate
npx prisma migrate deploy

# Build Next.js app
echo -e "${YELLOW}Building application...${NC}"
npm run build

# Setup PM2
echo -e "${YELLOW}Starting application with PM2...${NC}"
pm2 start npm --name gibby-chat -- start
pm2 save
pm2 startup systemd -u root --hp /root
pm2 save

# Get server IP
SERVER_IP=$(curl -s ifconfig.me)

# Setup Nginx
echo -e "${YELLOW}Configuring Nginx...${NC}"
cat > /etc/nginx/sites-available/gibby-chat << EOF
server {
    listen 80;
    server_name ${DOMAIN:-$SERVER_IP};

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

ln -s /etc/nginx/sites-available/gibby-chat /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Setup SSL if domain provided
if [ ! -z "$DOMAIN" ]; then
    echo -e "${YELLOW}Setting up SSL certificate...${NC}"
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL
    
    # Update .env with HTTPS
    sed -i "s|NEXTAUTH_URL=http://|NEXTAUTH_URL=https://|" /var/www/$REPO_NAME/.env
    
    # Restart app
    cd /var/www/$REPO_NAME
    pm2 restart gibby-chat
fi

# Setup firewall
echo -e "${YELLOW}Configuring firewall...${NC}"
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

# Create info file
cat > /root/server-info.txt << EOF
=========================================
GIBBY CHAT - SETUP COMPLETE!
=========================================

Your app is running at:
${DOMAIN:+https://$DOMAIN}
${DOMAIN:-http://$SERVER_IP}

Database:
- User: gibby
- Database: gibbychat
- Password: $DB_PASSWORD

NextAuth Secret: $NEXTAUTH_SECRET

Available AI Models:
- llama3.2:3b (Balanced)

Useful commands:
- pm2 status            # Check app status
- pm2 logs gibby-chat   # View logs
- pm2 restart gibby-chat # Restart app
- ollama list           # List AI models

To update from GitHub:
cd /var/www/$REPO_NAME
git pull
npm install
npm run build
pm2 restart gibby-chat

=========================================
EOF

echo ""
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
cat /root/server-info.txt