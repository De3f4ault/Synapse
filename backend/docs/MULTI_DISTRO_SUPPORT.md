# Multi-Distribution Support Update

## Changes Made

Updated all deployment scripts to support multiple Linux distributions with automatic OS detection.

### Supported Distributions

- **Arch Linux** (pacman)
- **Debian/Ubuntu** (apt-get)  
- **Fedora** (dnf)
- **RHEL/CentOS** (yum)

### Files Updated

#### 1. `scripts/setup-nginx.sh`

**Key Changes:**

- ✅ Automatic OS detection via `/etc/os-release`
- ✅ Package manager detection (pacman, apt-get, dnf, yum)
- ✅ Intelligent configuration path handling:
  - **Arch**: `/etc/nginx/conf.d/synapse.conf`
  - **Debian/Ubuntu**: `/etc/nginx/sites-available/synapse` + symlink
- ✅ Cross-distro systemd service name compatibility

#### 2. `scripts/ssl-setup.sh`

**Key Changes:**

- ✅ Systemd service name fallback (`nginx` or `nginx.service`)
- ✅ Robust error handling for Nginx reload

#### 3. `scripts/start-production.sh`

**Key Changes:**

- ✅ PostgreSQL client tool detection (pg_isready or psql)
- ✅ Graceful degradation when client tools not available

## Testing on Arch Linux

The scripts should now work correctly on your Arch Linux system:

```bash
# Should work now
sudo make nginx-install
sudo make ssl-setup
make prod-start
```

## Configuration Paths by Distribution

| Distribution | Config Location | Notes |
|--------------|----------------|-------|
| Arch Linux | `/etc/nginx/conf.d/synapse.conf` | Direct inclusion |
| Debian/Ubuntu | `/etc/nginx/sites-available/synapse` | Uses sites-enabled symlink |
| Fedora/RHEL | `/etc/nginx/conf.d/synapse.conf` | Direct inclusion |
