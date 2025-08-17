# Deployment Guide - Gibby Chat on Hetzner

## 📋 Table of Contents
1. [Budget Testing Setup](#budget-testing-setup) - Start here!
2. [Production Setup](#production-setup) - Scale later
3. [Management Tools](#management-tools)
4. [Scaling Operations](#scaling-operations)
5. [Troubleshooting](#troubleshooting)

---

## 🚀 Budget Testing Setup (~€25/month)

### Overview
- **1x Frontend Server**: CPX21 (3 vCPU, 4GB RAM) - €7.85/month
- **1x AI Server**: CPX31 (4 vCPU, 8GB RAM) - €13.10/month
- **Total**: ~€21/month + VAT

### Server 1: Frontend + Database (Ubuntu 22.04)

#### Option A: With Ploi (Recommended for Beginners)
```bash
# Ploi handles: SSL, deployments, database, monitoring
# Cost: €10/month for unlimited servers

# 1. Create server on Hetzner (CPX21)
# 2. Add server to Ploi.io
# 3. Ploi auto-installs: Nginx, PostgreSQL, Node.js, SSL
# 4. Deploy via GitHub integration
```

**Ploi Benefits:**
- Automatic SSL certificates
- One-click PostgreSQL setup
- GitHub auto-deploy
- Built-in monitoring
- Backup management
- Zero-downtime deployments

#### Option B: Manual Setup (More Control)
```bash
# SSH into server
ssh root@your-server-ip

# 1. Update system
apt update && apt upgrade -y

# 2. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 3. Install PostgreSQL
apt install postgresql postgresql-contrib -y
systemctl start postgresql

# 4. Install PM2 for Node.js management
npm install -g pm2

# 5. Install Nginx
apt install nginx -y

# 6. Install Certbot for SSL
apt install certbot python3-certbot-nginx -y

# 7. Clone and setup app
cd /var/www
git clone https://github.com/yourusername/gibby-chat-next.git
cd gibby-chat-next
npm install
npx prisma generate
npx prisma migrate deploy

# 8. Environment variables
cat > .env.production << 'EOF'
DATABASE_URL="postgresql://gibby:password@localhost:5432/gibbychat"
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-secret-key-here
OLLAMA_URL=http://ai-server-ip:11434
OLLAMA_API_KEY=your-api-key
EOF

# 9. Build and start
npm run build
pm2 start npm --name "gibby-chat" -- start
pm2 save
pm2 startup

# 10. Configure Nginx
cat > /etc/nginx/sites-available/gibby-chat << 'EOF'
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -s /etc/nginx/sites-available/gibby-chat /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 11. Setup SSL
certbot --nginx -d yourdomain.com
```

### Server 2: AI Server with K3s (Ready to Scale)

```bash
# SSH into AI server
ssh root@ai-server-ip

# 1. Install K3s (single node, ready to expand)
curl -sfL https://get.k3s.io | sh -s - \
  --write-kubeconfig-mode 644 \
  --disable traefik \
  --node-name ai-master-1

# 2. Install kubectl locally
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config

# 3. Create Ollama namespace and deployment
cat > ollama-minimal.yaml << 'EOF'
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
  replicas: 1  # Start with 1, scale later
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
    nodePort: 30434  # Access on server-ip:30434
EOF

kubectl apply -f ollama-minimal.yaml

# 4. Pull models
kubectl exec -it -n ollama deployment/ollama -- ollama pull llama3.2:3b

# 5. Setup basic auth with Nginx (security)
apt install nginx apache2-utils -y
htpasswd -c /etc/nginx/.htpasswd ollama

cat > /etc/nginx/sites-available/ollama << 'EOF'
server {
    listen 11434;
    
    location / {
        auth_basic "Ollama API";
        auth_basic_user_file /etc/nginx/.htpasswd;
        
        proxy_pass http://localhost:30434;
        proxy_set_header Host $host;
        
        # CORS for your frontend
        add_header 'Access-Control-Allow-Origin' 'https://yourdomain.com';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type';
        
        # Streaming support
        proxy_buffering off;
        chunked_transfer_encoding off;
    }
}
EOF

ln -s /etc/nginx/sites-available/ollama /etc/nginx/sites-enabled/
systemctl restart nginx
```

---

## 🎯 Quick Scaling (When Ready)

### Add More AI Nodes
```bash
# On new server, join existing cluster
curl -sfL https://get.k3s.io | K3S_URL=https://ai-master-1:6443 \
  K3S_TOKEN=your-token sh -s - agent

# Scale Ollama replicas
kubectl scale deployment/ollama -n ollama --replicas=3
```

### Convert to HA Setup
```bash
# Install hetzner-k3s tool
wget https://github.com/vitobotta/hetzner-k3s/releases/latest/download/hetzner-k3s-linux-amd64
chmod +x hetzner-k3s-linux-amd64

# Create config for migration
cat > scale-up.yaml << 'EOF'
cluster_name: gibby-ai-cluster
kubeconfig_path: "./kubeconfig"
k3s_version: v1.29.0+k3s1

networking:
  ssh:
    port: 22
    use_agent: false
  private_network:
    subnet: 10.0.0.0/16

masters_pool:
  instance_type: cpx31
  instance_count: 3
  location: fsn1

worker_pools:
  - name: cpu-pool
    instance_type: cpx31
    instance_count: 2
    location: fsn1
    autoscaler:
      enabled: true
      min_instances: 1
      max_instances: 5
EOF

# Create new HA cluster
./hetzner-k3s create --config scale-up.yaml

# Migrate workloads
kubectl --kubeconfig=./kubeconfig apply -f ollama-minimal.yaml
```

---

## 🛠️ Management & Monitoring

### Option 1: Ploi.io (Frontend Server)
- Server monitoring
- Database backups
- Log viewer
- Deploy webhooks
- SSL management

### Option 2: Free Tools

#### K9s (Terminal UI for Kubernetes)
```bash
# Install on your local machine
brew install k9s  # Mac
# or
curl -sS https://webinstall.dev/k9s | bash  # Linux

# Connect to cluster
k9s --kubeconfig ~/.kube/config
```

#### Uptime Monitoring
```bash
# Install Uptime Kuma (free, self-hosted)
docker run -d \
  --name uptime-kuma \
  -p 3001:3001 \
  -v uptime-kuma:/app/data \
  louislam/uptime-kuma:1
```

---

## 📊 Cost Optimization Tips

1. **Start Small**: Begin with minimum setup (~€21/month)
2. **Use Hetzner Snapshots**: Before major changes (€0.012/GB/month)
3. **Private Network**: Free bandwidth between Hetzner servers
4. **Backup Strategy**: 
   - Database: Daily snapshots
   - Models: Store in Hetzner Storage Box (€3.45/month for 1TB)

---

## 🔧 Environment Variables

### Frontend Server (.env.production)
```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/gibbychat"

# NextAuth
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# Ollama AI Server
OLLAMA_URL=http://ai-server-ip:11434
OLLAMA_API_KEY=your-api-key

# Optional
DEFAULT_MODEL=llama3.2:3b
```

### AI Server Environment
```bash
# K3s token (for adding nodes)
cat /var/lib/rancher/k3s/server/node-token

# Ollama settings
export OLLAMA_HOST=0.0.0.0
export OLLAMA_ORIGINS=https://yourdomain.com
export OLLAMA_NUM_PARALLEL=4
export OLLAMA_MAX_LOADED_MODELS=2
```

---

## 🚨 Troubleshooting

### Frontend Issues
```bash
# Check Node.js app
pm2 status
pm2 logs gibby-chat

# Check Nginx
nginx -t
systemctl status nginx

# Database
sudo -u postgres psql
\l  # List databases
\c gibbychat  # Connect
\dt  # List tables
```

### AI Server Issues
```bash
# Check K3s
kubectl get nodes
kubectl get pods -n ollama
kubectl logs -n ollama deployment/ollama

# Test Ollama
curl http://localhost:30434/api/health

# Resource usage
kubectl top nodes
kubectl top pods -n ollama
```

---

## 📈 Scaling Benchmarks

| Setup | Servers | Cost/month | Concurrent Users | Requests/sec |
|-------|---------|------------|------------------|--------------|
| Budget | 2 | €21 | 10-20 | 5-10 |
| Standard | 4 | €60 | 50-100 | 25-50 |
| Production | 8+ | €150+ | 200+ | 100+ |

---

## 🔐 Security Checklist

- [ ] SSL certificates installed
- [ ] Firewall configured (ufw or Hetzner Cloud Firewall)
- [ ] Database has strong password
- [ ] Ollama API has authentication
- [ ] Regular backups configured
- [ ] Monitoring alerts setup
- [ ] Rate limiting on Nginx
- [ ] CORS properly configured

---

## 📞 Quick Commands Reference

```bash
# Frontend Server
pm2 restart gibby-chat        # Restart app
npm run build && pm2 reload   # Deploy new version
npx prisma migrate deploy     # Run migrations

# AI Server  
kubectl scale deployment/ollama -n ollama --replicas=3  # Scale up
kubectl rollout restart deployment/ollama -n ollama     # Restart
kubectl exec -it -n ollama deployment/ollama -- bash    # Shell access

# Monitoring
pm2 monit                      # Frontend monitoring
k9s                           # Kubernetes monitoring
htop                          # System resources
```

---

## 🎯 Next Steps

1. **Week 1**: Deploy budget setup, test with few users
2. **Week 2**: Monitor performance, identify bottlenecks  
3. **Week 3**: Add monitoring, backups, security hardening
4. **Month 2**: Scale based on usage patterns
5. **Month 3**: Consider HA setup if needed

---

## 💡 Pro Tips

1. **Use Ploi.io for frontend** if you're not comfortable with server management
2. **Start with K3s** even for single node - makes scaling trivial
3. **Monitor everything** from day 1 - helps with capacity planning
4. **Document your setup** - future you will thank you
5. **Test scaling procedures** before you need them in production

---

This guide gets you from zero to production-ready with clear upgrade paths!