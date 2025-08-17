# 🚀 SUPER SIMPLE: Deploy Everything on ONE Server

## Total Time: 30 minutes
## Total Cost: €13/month (one server)

---

## Step 1: Get a Server (5 minutes)

1. **Go to Hetzner Cloud**: https://console.hetzner.cloud
2. **Create a server:**
   - Click red "Create Server" button
   - Location: Falkenstein
   - Image: **Ubuntu 22.04**
   - Type: **CPX31** (€13.10/month - 4 CPUs, 8GB RAM)
   - Name: gibby-chat
   - Click "Create"
3. **Save the IP address**: ________________

---

## Step 2: Push Your Code to GitHub (2 minutes)

In your project folder:
```bash
git add .
git commit -m "Deploy ready"
git push
```

Make sure `setup-everything.sh` is pushed!

---

## Step 3: Connect to Your Server (2 minutes)

Open Terminal (Mac) or PowerShell (Windows):

```bash
ssh root@YOUR-SERVER-IP
```

Enter the password from Hetzner's email.

---

## Step 4: Run the Magic Setup Script (20 minutes)

Copy and paste these THREE commands, one at a time:

**Command 1:**
```bash
apt update && apt install -y wget
```

**Command 2** (replace YOUR-GITHUB-USERNAME):
```bash
wget https://raw.githubusercontent.com/YOUR-GITHUB-USERNAME/gibby-chat-next/main/setup-everything.sh
```

**Command 3:**
```bash
bash setup-everything.sh
```

### The script will ask you:

1. **Domain**: Press Enter if you don't have one (will use IP)
2. **Email**: Your email (for SSL certificate)
3. **GitHub username**: Your GitHub username
4. **Repo name**: Press Enter (uses gibby-chat-next)

### Wait 15-20 minutes while it:
- ✅ Installs Node.js
- ✅ Installs PostgreSQL database
- ✅ Installs Ollama AI
- ✅ Downloads AI models
- ✅ Clones your code
- ✅ Sets up everything
- ✅ Starts your app

---

## Step 5: You're Done! 🎉

When it finishes, you'll see:
```
✅ Setup Complete!
Your app is running at: http://YOUR-SERVER-IP
```

**Visit your site**: `http://YOUR-SERVER-IP`

---

## 🔧 Useful Commands

Once your app is running:

**Check if app is running:**
```bash
pm2 status
```

**View logs:**
```bash
pm2 logs gibby-chat
```

**Restart app:**
```bash
pm2 restart gibby-chat
```

**Update from GitHub:**
```bash
cd /var/www/gibby-chat-next
git pull
npm install
npm run build
pm2 restart gibby-chat
```

---

## 🚨 Troubleshooting

### "Cannot connect to database"
```bash
# Restart PostgreSQL
systemctl restart postgresql
```

### "Site not loading"
```bash
# Check if app is running
pm2 status
# If not running:
cd /var/www/gibby-chat-next
pm2 start npm --name gibby-chat -- start
```

### "502 Bad Gateway"
```bash
# Restart everything
pm2 restart gibby-chat
systemctl restart nginx
```

### View all logs
```bash
# App logs
pm2 logs gibby-chat

# Nginx logs
tail -f /var/log/nginx/error.log
```

---

## 📝 What You Get

With this ONE server (€13/month):
- ✅ Your Next.js app
- ✅ PostgreSQL database
- ✅ AI model (LLaMA 3.2)
- ✅ SSL certificate (if using domain)
- ✅ Auto-restart on crashes
- ✅ Ready for 10-20 users

---

## 🎯 Adding a Domain Later

If you get a domain later:

1. Point domain to your server IP at your domain provider
2. Run:
```bash
certbot --nginx -d yourdomain.com
```
3. Update .env:
```bash
nano /var/www/gibby-chat-next/.env
# Change NEXTAUTH_URL to https://yourdomain.com
```
4. Restart:
```bash
pm2 restart gibby-chat
```

---

## 💡 Tips

- The first AI response might be slow (models loading)
- Server can handle ~20 concurrent users
- Backups: Hetzner offers snapshots for €0.012/GB/month
- Monitor usage: `htop` shows CPU/memory

---

That's it! No Docker, no Kubernetes, no complexity. Just one server running everything! 🚀