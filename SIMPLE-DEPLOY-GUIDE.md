# 🚀 Super Simple Deployment Guide for Beginners

## What We're Building
- **2 separate servers**: One for your website, one for AI
- **Total cost**: About €31/month
- **Time needed**: 1 hour

---

## 📋 Before You Start

### You Need:
1. **GitHub account** with your code uploaded
2. **Hetzner Cloud account** (German hosting company)
3. **Ploi.io account** (makes deployment easy, free trial available)
4. **A domain name** (optional - you can test without one)

### Accounts to Create:
- **Hetzner**: https://www.hetzner.com/cloud
- **Ploi**: https://ploi.io (use free trial)

---

## 🎯 Step-by-Step Guide

### Part 1: Create Your Two Servers on Hetzner

1. **Login to Hetzner Cloud**
   - Go to https://console.hetzner.cloud
   - Click "New Project" → Name it "gibby-chat"

2. **Create Frontend Server** (for your website)
   - Click red "+ Create Server" button
   - Location: Choose "Falkenstein"
   - Image: Select "Ubuntu 22.04"
   - Type: Click "CPX11" (€5.18/month) or "CPX21" (€7.85/month)
   - Name: Type "frontend-server"
   - Click "Create & Buy now"
   - **SAVE THE IP ADDRESS!** (looks like: 65.21.xxx.xxx)

3. **Create AI Server** (for the AI models)
   - Click "+ Create Server" again
   - Location: Same as before "Falkenstein"
   - Image: "Ubuntu 22.04"
   - Type: Click "CPX31" (€13.10/month - needs more power)
   - Name: Type "ai-server"
   - Click "Create & Buy now"
   - **SAVE THIS IP ADDRESS TOO!**

You now have 2 IP addresses. Write them down:
- Frontend Server IP: _______________
- AI Server IP: _______________

---

### Part 2: Setup AI Server (Do This First!)

1. **Open Terminal/Command Prompt**
   - Mac: Press Cmd+Space, type "Terminal"
   - Windows: Press Windows key, type "PowerShell"

2. **Connect to your AI server**
   ```bash
   ssh root@YOUR-AI-SERVER-IP
   ```
   - Type "yes" when asked
   - Enter the password Hetzner emailed you

3. **Run the setup script**
   
   Copy and paste these commands ONE AT A TIME:
   
   **First command** (replace YOUR-GITHUB-USERNAME with your actual GitHub username):
   ```bash
   wget https://raw.githubusercontent.com/YOUR-GITHUB-USERNAME/gibby-chat-next/main/scripts/setup-ai-server.sh
   ```
   
   **Second command:**
   ```bash
   chmod +x setup-ai-server.sh
   ```
   
   **Third command:**
   ```bash
   ./setup-ai-server.sh
   ```

4. **Answer the questions**
   - Password for API: Choose something secure (write it down!)
   - Frontend domain: Enter your domain or just your frontend IP

5. **Wait 10-15 minutes**
   The script will install everything automatically.

6. **Save the information shown at the end!**
   It will show:
   - API URL
   - API Password
   - Settings for your frontend

---

### Part 3: Setup Frontend Server with Ploi

#### A. Connect Your Server to Ploi

1. **Login to Ploi.io**
   - Go to https://ploi.io
   - Create account if you haven't

2. **Add your frontend server**
   - Click "Servers" → "New server"
   - Choose "Custom VPS"
   - Name: "Frontend Server"
   - IP Address: Your frontend server IP
   - Click "Add Server"

3. **Ploi will show you a command**
   - Copy the command (starts with `wget`)
   - Go back to Terminal/PowerShell
   - Connect to frontend server:
     ```bash
     ssh root@YOUR-FRONTEND-IP
     ```
   - Paste and run Ploi's command
   - Wait 5-10 minutes for installation

#### B. Create Your Website in Ploi

1. **In Ploi, go to your server**
   - Click on "Frontend Server"

2. **Click "New Site"**
   - Domain: 
     - If you have domain: `yourdomain.com`
     - No domain? Use: `YOUR-FRONTEND-IP.nip.io`
   - Project type: Select "NodeJS"
   - Node version: "20"
   - Create database: ✅ Check this box
   - Click "Create Site"

3. **Save database info** (Ploi will show this)
   - Database name: _______________
   - Username: _______________
   - Password: _______________

#### C. Connect Your GitHub

1. **In Ploi, go to your site**
   - Click "Git" tab
   - Click "Install repository"

2. **Fill in:**
   - Provider: GitHub
   - Repository: `yourusername/gibby-chat-next`
   - Branch: `main`
   - Install command:
     ```
     npm install
     npx prisma generate
     ```
   - Deploy script:
     ```
     npm run deploy
     pm2 restart gibby-chat || pm2 start ecosystem.config.js
     ```

3. **Click "Install Repository"**

#### D. Add Your Settings

1. **In Ploi, click "Environment" tab**

2. **Click "Edit environment"**

3. **Copy and paste this** (replace with your values):
   ```env
   # Database (use the info Ploi showed you)
   DATABASE_URL="postgresql://ploi_xxxxx:PASSWORD@127.0.0.1:5432/ploi_xxxxx"
   
   # Your website URL
   NEXTAUTH_URL=https://YOUR-DOMAIN-OR-IP-HERE
   
   # Generate secret (see below)
   NEXTAUTH_SECRET=paste-generated-secret-here
   
   # AI Server (from Part 2)
   OLLAMA_URL=http://YOUR-AI-SERVER-IP:11434
   OLLAMA_API_KEY=your-ai-password-from-part-2
   
   # Settings
   DEFAULT_MODEL=llama3.2:3b
   NODE_ENV=production
   ```

4. **Generate the NEXTAUTH_SECRET**
   - Go to: https://generate-secret.vercel.app/32
   - Copy the generated text
   - Paste it after NEXTAUTH_SECRET=

5. **Click "Save"**

#### E. Deploy Your Website

1. **In Ploi, click "Deployments" tab**
2. **Click "Deploy"**
3. **Wait 2-3 minutes**
4. **If there are errors**, check "Deployment log" at bottom

---

### Part 4: Test Everything

1. **Visit your website**
   - Go to: `https://your-domain` or `http://your-ip.nip.io`

2. **Create an account**
   - Click "Sign Up"
   - Enter email and password

3. **Test the chat**
   - Type a message
   - You should get a response!

---

## 🔧 Troubleshooting

### "Cannot connect to database"
- In Ploi → Environment tab
- Check DATABASE_URL starts with `postgresql://`
- Make sure password is correct

### "Cannot connect to Ollama"
- Check OLLAMA_URL in Ploi environment
- Should be: `http://AI-SERVER-IP:11434`
- Verify AI server setup completed

### "Build failed"
- In Ploi → Deployments → View log
- Look for red error messages
- Common fix: Click Deploy again

### Website not loading
- Wait 5 minutes after deploy
- Check if using https:// or http://
- In Ploi → SSL tab → Click "Activate"

---

## 📱 Quick Commands Cheat Sheet

### Connect to servers:
```bash
# Frontend server
ssh root@FRONTEND-IP

# AI server  
ssh root@AI-IP
```

### Check if AI is working:
```bash
# Run on AI server
kubectl get pods -n ollama
# Should show "Running"
```

### Restart website:
```bash
# Run on frontend server
pm2 restart gibby-chat
```

### View logs:
```bash
# Frontend logs
pm2 logs gibby-chat

# AI logs (on AI server)
kubectl logs -n ollama deployment/ollama
```

---

## 💰 Monthly Costs

- Frontend Server (CPX21): €7.85
- AI Server (CPX31): €13.10
- Ploi.io: €10
- **Total: ~€31/month**

---

## 🎉 You're Done!

Your app is now live with:
- ✅ Secure authentication
- ✅ AI chat with 2 models
- ✅ PostgreSQL database
- ✅ Automatic SSL certificate
- ✅ Ready to scale when needed

### Next Steps:
1. Share your site with friends
2. Monitor usage in Ploi dashboard
3. When you get more users, we can add more AI servers!

---

## 📞 Getting Help

- **Ploi Support**: support@ploi.io
- **Hetzner Support**: Through their console
- **Your app logs**: Ploi → Your site → Logs

Remember: Most problems are solved by:
1. Checking environment variables
2. Clicking "Deploy" again
3. Waiting 5 minutes

Good luck! 🚀