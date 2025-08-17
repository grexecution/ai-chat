#!/bin/bash

# ========================================
# GIBBY CHAT - AI SERVER SETUP SCRIPT
# Run this on your AI server (second server)
# ========================================

echo "🚀 Starting Gibby Chat AI Server Setup..."
echo "This will install Ollama with Kubernetes (K3s)"
echo ""

# Get user input
read -p "Enter a password for API access (remember this!): " -s API_PASSWORD
echo ""
read -p "Enter your frontend domain or IP (e.g., chat.example.com or 1.2.3.4): " FRONTEND_URL
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Update system
echo -e "${YELLOW}Step 1: Updating system...${NC}"
apt update && apt upgrade -y

# Step 2: Install K3s
echo -e "${YELLOW}Step 2: Installing K3s (Kubernetes)...${NC}"
curl -sfL https://get.k3s.io | sh -s - \
  --write-kubeconfig-mode 644 \
  --disable traefik \
  --node-name ai-master-1

# Wait for K3s to be ready
sleep 10

# Setup kubectl
mkdir -p ~/.kube
cp /etc/rancher/k3s/k3s.yaml ~/.kube/config

# Step 3: Create Ollama deployment
echo -e "${YELLOW}Step 3: Deploying Ollama...${NC}"
cat > /tmp/ollama-setup.yaml << EOF
apiVersion: v1
kind: Namespace
metadata:
  name: ollama

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ollama
  namespace: ollama
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ollama
  template:
    metadata:
      labels:
        app: ollama
    spec:
      containers:
      - name: ollama
        image: ollama/ollama:latest
        ports:
        - containerPort: 11434
        env:
        - name: OLLAMA_HOST
          value: "0.0.0.0"
        - name: OLLAMA_ORIGINS
          value: "https://${FRONTEND_URL},http://${FRONTEND_URL}"
        resources:
          requests:
            cpu: "2"
            memory: "4Gi"
        volumeMounts:
        - name: models
          mountPath: /root/.ollama
      volumes:
      - name: models
        hostPath:
          path: /var/lib/ollama
          type: DirectoryOrCreate

---
apiVersion: v1
kind: Service
metadata:
  name: ollama-service
  namespace: ollama
spec:
  type: NodePort
  selector:
    app: ollama
  ports:
  - port: 11434
    targetPort: 11434
    nodePort: 30434
EOF

kubectl apply -f /tmp/ollama-setup.yaml

# Wait for pod to be ready
echo "Waiting for Ollama to start (this may take 1-2 minutes)..."
kubectl wait --for=condition=ready pod -l app=ollama -n ollama --timeout=180s

# Step 4: Download AI models
echo -e "${YELLOW}Step 4: Downloading AI models (this will take 5-10 minutes)...${NC}"
kubectl exec -it -n ollama deployment/ollama -- ollama pull gemma2:2b
kubectl exec -it -n ollama deployment/ollama -- ollama pull llama3.2:3b

# Step 5: Setup Nginx with authentication
echo -e "${YELLOW}Step 5: Setting up secure API access...${NC}"
apt install nginx apache2-utils -y

# Create password file
htpasswd -b -c /etc/nginx/.htpasswd ollama "$API_PASSWORD"

# Configure Nginx
cat > /etc/nginx/sites-available/ollama << 'EOF'
server {
    listen 11434;
    server_name _;
    
    location / {
        auth_basic "Ollama API";
        auth_basic_user_file /etc/nginx/.htpasswd;
        
        proxy_pass http://localhost:30434;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '$http_origin' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        
        if ($request_method = 'OPTIONS') {
            return 204;
        }
        
        # Streaming support
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;
        proxy_read_timeout 86400s;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/ollama /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Restart Nginx
systemctl restart nginx

# Step 6: Configure firewall
echo -e "${YELLOW}Step 6: Configuring firewall...${NC}"
ufw allow 22/tcp
ufw allow 11434/tcp
ufw --force enable

# Step 7: Create info file
SERVER_IP=$(curl -s ifconfig.me)
cat > /root/ai-server-info.txt << EOF
=========================================
GIBBY CHAT AI SERVER - SETUP COMPLETE!
=========================================

Your AI server is ready! Save this information:

API URL: http://${SERVER_IP}:11434
API Username: ollama
API Password: [the password you entered]

For your frontend .env file:
OLLAMA_URL=http://${SERVER_IP}:11434
OLLAMA_API_KEY=${API_PASSWORD}

To check if everything is working:
curl -u ollama:${API_PASSWORD} http://${SERVER_IP}:11434/api/tags

Available models:
- gemma2:2b (Fast)
- llama3.2:3b (Balanced)

=========================================
EOF

# Final output
echo ""
echo -e "${GREEN}✅ AI Server Setup Complete!${NC}"
echo ""
cat /root/ai-server-info.txt
echo ""
echo "This information is also saved in /root/ai-server-info.txt"