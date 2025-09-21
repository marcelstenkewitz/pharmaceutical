# Render.com Deployment Guide

## Prerequisites
- [Render.com account](https://render.com) (free tier available)
- Git repository (GitHub, GitLab, or Bitbucket)
- Docker knowledge (optional)

## Quick Start (Recommended)

### 1. Connect Repository
1. Go to [render.com](https://render.com) and sign up/login
2. Click **"New +"** → **"Web Service"**
3. Connect your Git repository
4. Select your pharmaceutical repository

### 2. Configure Service
- **Name**: `pharmaceutical-tracking-system`
- **Environment**: `Docker`
- **Region**: Oregon (or your preferred region)
- **Branch**: `main`
- **Dockerfile Path**: `./Dockerfile`
- **Plan**: Free (or Starter for better performance)

### 3. Advanced Settings
- **Health Check Path**: `/api/health`
- **Auto-Deploy**: Yes (deploys on git push)

### 4. Environment Variables
Add these in the Render dashboard:
- `NODE_ENV`: `production`
- `PORT`: `3001`

### 5. Deploy
Click **"Create Web Service"** and Render will automatically build and deploy!

## Alternative: Infrastructure as Code

If you prefer to use the `render.yaml` file:

### 1. Push render.yaml to your repo
```bash
git add render.yaml
git commit -m "Add Render configuration"
git push origin main
```

### 2. Import from YAML
1. In Render dashboard, click **"New +"** → **"Blueprint"**
2. Connect your repository
3. Render will read `render.yaml` and configure everything automatically

## Configuration Details

### Service Configuration
- **Environment**: Docker (uses your Dockerfile)
- **Port**: 3001 (internal), 443 (HTTPS external)
- **Region**: Oregon (change in render.yaml if needed)
- **Plan**: Free tier (512MB RAM, shared CPU)
- **Disk**: 1GB persistent storage for JSON files

### Environment Variables
Configured automatically:
- `NODE_ENV=production`
- `PORT=3001`

### Health Checks
- **Endpoint**: `/api/health`
- **Automatic monitoring and restarts**

## Data Persistence
✅ **Persistent Storage**: Your JSON files (`clients.json`, `manual-entries.json`, etc.) are stored in a persistent disk at `/app/data` and survive deployments.

## Local Testing

### Test with Docker
```bash
# Build and run locally
npm run docker-build
npm run docker-run

# Test the app at http://localhost:3001
```

### Development Mode
```bash
# Install dependencies
npm run install-all

# Start frontend (localhost:3000)
npm run dev-frontend

# Start backend (localhost:3001)
npm run dev-backend
```

## Render.com Features

### Automatic Deployments
- **Auto-deploy on git push** to main branch
- **Build logs** available in dashboard
- **Zero-downtime deployments**

### Monitoring
- **Built-in logs** - view in Render dashboard
- **Metrics** - CPU, memory, response times
- **Health checks** - automatic restarts if unhealthy
- **Uptime monitoring**

### Scaling
Free tier limitations:
- **512MB RAM, shared CPU**
- **Sleeps after 15 minutes of inactivity**
- **750 hours/month free**

Paid tiers offer:
- **Always-on service**
- **More RAM/CPU**
- **Custom domains**
- **Priority support**

## Custom Domain

### 1. Add Domain in Render
1. Go to your service settings
2. Click **"Custom Domains"**
3. Add your domain (e.g., `yourdomain.com`)

### 2. Configure DNS
Add this CNAME record to your DNS:
```
CNAME  @  pharmaceutical-tracking-system.onrender.com
```

### 3. SSL Certificate
Render automatically provisions SSL certificates for custom domains.

## Environment Variables

### Common Variables
- `NODE_ENV`: `production`
- `PORT`: `3001`

### Custom Variables (if needed)
You can add custom environment variables in the Render dashboard under **Environment**.

## Troubleshooting

### Build Failures
1. Check **build logs** in Render dashboard
2. Verify **Dockerfile** syntax
3. Check **dependencies** in package.json
4. Ensure **Node.js version** compatibility

### Runtime Issues
1. Check **service logs** in dashboard
2. Verify **health check** endpoint (`/api/health`)
3. Check **disk space** usage
4. Monitor **memory usage**

### Performance Issues
1. **Upgrade plan** for better performance
2. **Add environment variables** for optimization
3. **Monitor metrics** in dashboard

## Updates and Deployment

### Automatic Updates
```bash
git add .
git commit -m "Update pharmaceutical app"
git push origin main
# Render automatically deploys!
```

### Manual Deploy
1. Go to Render dashboard
2. Click **"Manual Deploy"**
3. Choose **"Clear build cache"** if needed

### Rollback
1. Go to **"Deploys"** tab in dashboard
2. Click **"Rollback"** on previous deployment

## Cost and Limits

### Free Tier
- **512MB RAM**
- **Shared CPU**
- **750 hours/month**
- **100GB bandwidth/month**
- **1GB persistent disk**
- **Sleeps after 15 min of inactivity**

### Starter Plan ($7/month)
- **512MB RAM**
- **Always-on**
- **Unlimited hours**
- **100GB bandwidth**
- **Custom domains**

## Production URLs
- **App**: `https://pharmaceutical-tracking-system.onrender.com`
- **API**: `https://pharmaceutical-tracking-system.onrender.com/api/*`
- **Custom domain**: `https://yourdomain.com` (if configured)

## Backup Strategy

### Download Data
1. Access your service shell in Render dashboard
2. Navigate to `/app/data`
3. Download JSON files as needed

### Automated Backup
Consider setting up a scheduled job to backup data files to cloud storage.

## Support
- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com/)
- [Render Support](https://render.com/support)