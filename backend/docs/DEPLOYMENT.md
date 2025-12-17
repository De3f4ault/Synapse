# SYNAPSE - Production Deployment Guide

This guide covers deploying the SYNAPSE backend with Nginx as a reverse proxy for local/single-server production environments.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Detailed Setup](#detailed-setup)
4. [Configuration](#configuration)
5. [SSL/HTTPS Setup](#sslhttps-setup)
6. [Systemd Service](#systemd-service)
7. [Monitoring & Logs](#monitoring--logs)
8. [Troubleshooting](#troubleshooting)
9. [Performance Tuning](#performance-tuning)

---

## Prerequisites

### System Requirements

- **OS**: Linux (Ubuntu 20.04+ recommended)
- **Python**: 3.10 or higher
- **Node.js**: 16+ (for frontend build)
- **RAM**: Minimum 2GB, 4GB+ recommended
- **Disk**: 10GB+ free space

### Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Nginx
sudo apt install -y nginx

# Install PostgreSQL (if not using Docker)
sudo apt install -y postgresql postgresql-contrib

# Install Redis (if not using Docker)
sudo apt install -y redis-server

# Install Python dependencies
pip install -r requirements.txt
pip install gunicorn
```

---

## Quick Start

For experienced users who want to get up and running quickly:

```bash
# 1. Build production assets
make prod-build

# 2. Install and configure Nginx
make nginx-install

# 3. Generate SSL certificates
make ssl-setup

# 4. Start production server
make prod-start

# Access at: https://localhost
```

---

## Detailed Setup

### Step 1: Environment Configuration

Ensure your `.env` file is properly configured:

```bash
# Copy example if needed
cp .env.example .env

# Edit configuration
nano .env
```

Key settings to verify:

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string  
- `GEMINI_API_KEY`: Your Google Gemini API key
- `JWT_SECRET_KEY`: Strong secret key (generate with `openssl rand -hex 32`)

### Step 2: Database Setup

```bash
# Start PostgreSQL (if using Docker)
make docker-up

# Or start system PostgreSQL
sudo systemctl start postgresql

# Run migrations
make migrate
```

### Step 3: Frontend Build

The frontend must be built to serve static files through Nginx:

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies (if not already done)
npm install

# Build production bundle
npm run build

# Return to backend
cd ../backend
```

Or use the Makefile:

```bash
make prod-build
```

This creates optimized static files in `frontend/dist/`.

### Step 4: Install Nginx

```bash
# This will:
# - Install Nginx (if not present)
# - Copy configuration to /etc/nginx/sites-available/
# - Enable the site
# - Test and reload Nginx
make nginx-install
```

**What this does:**

- Copies `config/nginx.conf` to `/etc/nginx/sites-available/synapse`
- Creates symlink to `/etc/nginx/sites-enabled/synapse`
- Disables default Nginx site
- Tests configuration and reloads Nginx

### Step 5: SSL Certificates

For local development with HTTPS:

```bash
make ssl-setup
```

This generates self-signed SSL certificates. Browsers will show a security warning - this is expected for self-signed certs.

**For production with a real domain**, use Let's Encrypt:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Certbot will automatically update nginx.conf
```

### Step 6: Start Production Server

```bash
# Option 1: Run in foreground (for testing)
make prod-start

# Option 2: Run with systemd (recommended for production)
make prod-install-service
sudo systemctl start synapse
```

---

## Configuration

### Nginx Configuration

The main Nginx configuration is in `config/nginx.conf`:

**Key Features:**

- **HTTPS**: SSL/TLS termination on port 443
- **HTTP to HTTPS redirect**: All HTTP traffic redirected to HTTPS
- **Load Balancing**: Distributes requests across Gunicorn workers
- **WebSocket Support**: Handles WebSocket upgrades for `/ws/*` routes
- **Rate Limiting**:
  - API endpoints: 10 req/s with burst of 20
  - General traffic: 30 req/s with burst of 50
- **Static File Serving**: Direct Nginx serving for `/assets/` and `/uploads/`
- **Security Headers**: CSP, X-Frame-Options, X-Content-Type-Options
- **Gzip Compression**: For text-based responses

**To modify:**

1. Edit `config/nginx.conf`
2. Test configuration: `sudo nginx -t`
3. Reload Nginx: `sudo nginx -s reload`

### Gunicorn Configuration

Configuration in `config/gunicorn.conf.py`:

**Default Settings:**

- **Workers**: `(CPU cores × 2) + 1`
- **Worker Class**: `uvicorn.workers.UvicornWorker` (ASGI support)
- **Bind**: `0.0.0.0:8000`
- **Timeout**: 30 seconds
- **Max Requests**: 1000 (workers restart after processing 1000 requests)

**To customize workers:**

```bash
export GUNICORN_WORKERS=4
make prod-start
```

---

## SSL/HTTPS Setup

### Self-Signed Certificates (Local Dev)

```bash
# Generate certificates
make ssl-setup

# Certificates created at:
# - /etc/nginx/ssl/synapse.crt
# - /etc/nginx/ssl/synapse.key
```

**Browser Warning:** Self-signed certificates will trigger security warnings. Click "Advanced" → "Proceed to site" to continue.

### Let's Encrypt (Production)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal (Certbot adds this automatically)
sudo certbot renew --dry-run
```

**Certbot will:**

- Obtain certificate from Let's Encrypt
- Update Nginx configuration automatically
- Set up auto-renewal via cron/systemd timer

---

## Systemd Service

For automatic startup and management:

### Install Service

```bash
make prod-install-service
```

This copies `config/synapse.service` to `/etc/systemd/system/`.

### Manage Service

```bash
# Start service
sudo systemctl start synapse

# Stop service
sudo systemctl stop synapse

# Restart service
sudo systemctl restart synapse

# Check status
sudo systemctl status synapse

# Enable auto-start on boot
sudo systemctl enable synapse

# Disable auto-start
sudo systemctl disable synapse

# View logs
sudo journalctl -u synapse -f
```

---

## Monitoring & Logs

### Check Service Status

```bash
# Quick status check
make prod-status

# Output shows:
# - Gunicorn processes
# - Nginx status
# - PostgreSQL status
# - Redis status
```

### Log Locations

**Nginx Logs:**

```bash
# Access log
sudo tail -f /var/log/nginx/synapse_access.log

# Error log
sudo tail -f /var/log/nginx/synapse_error.log
```

**Application Logs:**

```bash
# If running via systemd
sudo journalctl -u synapse -f

# If running manually, check stdout/stderr
```

**Gunicorn Logs:**
Configured to output to stdout/stderr (captured by systemd or terminal).

### Health Checks

```bash
# Backend health
curl http://localhost:8000/ping

# Through Nginx (HTTP - will redirect to HTTPS)
curl -L http://localhost/api/v1/ping

# Through Nginx (HTTPS - self-signed cert)
curl -k https://localhost/api/v1/ping
```

---

## Troubleshooting

### Nginx Won't Start

**Check configuration:**

```bash
sudo nginx -t
```

**View error logs:**

```bash
sudo tail -n 50 /var/log/nginx/error.log
```

**Common issues:**

- Port 80/443 already in use: Check with `sudo lsof -i :80` and `sudo lsof -i :443`
- SSL certificate missing: Run `make ssl-setup`
- Frontend dist not found: Run `make prod-build`

### Backend Won't Start

**Check if port 8000 is in use:**

```bash
sudo lsof -i :8000
```

**Check database connection:**

```bash
# Test PostgreSQL
psql -h localhost -U synapse_user -d synapse

# Test Redis
redis-cli -h localhost ping
```

**Check environment variables:**

```bash
# Ensure .env file exists and is loaded
cat .env | grep DATABASE_URL
```

### 502 Bad Gateway

This means Nginx can't reach the backend.

**Checks:**

1. Is Gunicorn running? `make prod-status`
2. Is it listening on port 8000? `sudo lsof -i :8000`
3. Check backend logs for errors

**Fix:**

```bash
# Restart backend
make prod-restart

# Or if using systemd
sudo systemctl restart synapse
```

### WebSocket Connection Fails

**Check Nginx configuration:**

- Ensure WebSocket upgrade headers are present in `/ws/` location block
- Check error logs: `sudo tail -f /var/log/nginx/synapse_error.log`

**Test WebSocket:**

```bash
# Install wscat if not present
npm install -g wscat

# Test connection
wscat -c ws://localhost/ws/test
```

### Rate Limiting Errors (429)

If you're hitting rate limits during testing:

**Temporarily disable:**
Edit `config/nginx.conf` and comment out `limit_req` directives:

```nginx
# limit_req zone=api_limit burst=20 nodelay;
```

Then reload: `sudo nginx -s reload`

---

## Performance Tuning

### Gunicorn Workers

**Formula:** `(2 × CPU cores) + 1`

For a 4-core server: `(2 × 4) + 1 = 9 workers`

**Adjust workers:**

```python
# Edit config/gunicorn.conf.py
workers = 9  # Or use environment variable
```

Or set via environment:

```bash
export GUNICORN_WORKERS=9
make prod-start
```

### Nginx Optimization

**Worker Connections:**

```nginx
# In /etc/nginx/nginx.conf
events {
    worker_processes auto;
    worker_connections 2048;
}
```

**File Descriptor Limits:**

```nginx
# In server block
worker_rlimit_nofile 65535;
```

**Caching:**

```nginx
# Add to http block in /etc/nginx/nginx.conf
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;
```

### Database Connections

**PostgreSQL connection pooling:**
Already handled by SQLAlchemy in the backend.

**Monitor connections:**

```sql
SELECT count(*) FROM pg_stat_activity;
```

### System Limits

**Increase file descriptors:**

```bash
# Edit /etc/security/limits.conf
* soft nofile 65536
* hard nofile 65536
```

**Reboot or re-login for changes to take effect.**

---

## Scaling Considerations

### Vertical Scaling (Single Server)

1. **Increase CPU/RAM** on your server
2. **Adjust Gunicorn workers** to match new CPU count
3. **Tune PostgreSQL** shared_buffers, max_connections
4. **Enable Redis caching** for frequently accessed data

### Horizontal Scaling (Multiple Servers)

For future scaling beyond a single server:

1. **Load Balancer**: Use dedicated load balancer (HAProxy, AWS ELB) in front of multiple app servers
2. **Shared Database**: Move PostgreSQL to dedicated server
3. **Shared Redis**: Use Redis cluster or managed service
4. **Shared Storage**: Use NFS or S3 for uploaded files
5. **Session Management**: Use Redis for session storage (already configured)

---

## Quick Reference

### Makefile Commands

```bash
make prod-build           # Build frontend + install Gunicorn
make nginx-install        # Install Nginx configuration
make ssl-setup           # Generate SSL certificates
make prod-start          # Start Gunicorn server
make prod-stop           # Stop Gunicorn server
make prod-restart        # Restart server
make prod-status         # Check service status
make prod-install-service # Install systemd service
```

### Service Management

```bash
# Manual start/stop
make prod-start
make prod-stop

# Systemd management
sudo systemctl {start|stop|restart|status} synapse
sudo journalctl -u synapse -f
```

### Nginx Management

```bash
sudo nginx -t              # Test configuration
sudo nginx -s reload       # Reload configuration
sudo systemctl restart nginx  # Restart Nginx
sudo tail -f /var/log/nginx/synapse_error.log  # View logs
```

---

## Security Checklist

- [ ] Change `JWT_SECRET_KEY` in `.env` to a strong random value
- [ ] Use HTTPS in production (Let's Encrypt or valid SSL certificate)
- [ ] Keep Nginx, Python, and system packages updated
- [ ] Configure firewall (UFW): Allow only 80, 443, and SSH
- [ ] Use environment variables for secrets (never commit `.env`)
- [ ] Enable automatic security updates
- [ ] Regular database backups
- [ ] Monitor logs for suspicious activity
- [ ] Rate limiting configured (already done)
- [ ] Security headers enabled (already done)

---

## Support

For issues or questions:

1. Check logs: Nginx, application, system logs
2. Review this documentation
3. Check GitHub issues (if applicable)
4. Verify all prerequisites are met

---

**Happy Deploying! 🚀**
