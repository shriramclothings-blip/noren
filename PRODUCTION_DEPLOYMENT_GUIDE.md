# FINAL DEPLOYMENT GUIDE - NOREN MESSAGING PLATFORM

## 🎯 PRODUCTION DEPLOYMENT - STEP BY STEP

This guide takes you from development to production in under 1 hour.

---

## ⚠️ PRE-DEPLOYMENT CHECKLIST

### Environment
- [ ] PostgreSQL database ready
- [ ] Node.js v18+ installed
- [ ] npm v8+ installed
- [ ] Docker installed (for containerized deployment)
- [ ] Cloudinary account configured
- [ ] JWT secret generated (min 32 chars)
- [ ] SMTP server configured (for emails)

### Security
- [ ] SSL certificates obtained
- [ ] JWT secret secure and unique
- [ ] Database credentials secure
- [ ] API keys rotated
- [ ] Environment variables not in git
- [ ] Rate limiting configured
- [ ] CORS properly set

### Infrastructure
- [ ] Server ready (AWS/Azure/DigitalOcean)
- [ ] Firewall rules configured
- [ ] Load balancer ready (optional)
- [ ] CDN configured (optional)
- [ ] Monitoring setup (optional)
- [ ] Backup strategy defined
- [ ] Rollback plan prepared

---

## 📋 STEP 1: PREPARE ENVIRONMENT (10 minutes)

### 1.1 Create Production Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create production database
CREATE DATABASE noren_db_prod;
CREATE USER noren_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE noren_db_prod TO noren_user;
ALTER DATABASE noren_db_prod OWNER TO noren_user;

# Exit
\q
```

### 1.2 Create Production Environment File
```bash
# Backend environment
cat > backend/.env.production << 'EOF'
# Database
DATABASE_URL=postgresql://noren_user:secure_password@localhost:5432/noren_db_prod
DB_HOST=localhost
DB_PORT=5432
DB_NAME=noren_db_prod
DB_USER=noren_user
DB_PASSWORD=secure_password

# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Authentication
JWT_SECRET=your_long_secure_secret_key_min_32_chars
JWT_EXPIRE=7d
REFRESH_TOKEN_SECRET=your_other_secure_secret_key

# Cloudinary (Media Storage)
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=noreply@norenapp.com

# Frontend
FRONTEND_URL=https://yourdomain.com
ADMIN_URL=https://admin.yourdomain.com

# Security
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/noren/server.log
EOF
```

### 1.3 Create Frontend Environment File
```bash
cat > noren-messaging-frontend/.env.production << 'EOF'
VITE_API_URL=https://yourdomain.com/api
VITE_WS_URL=https://yourdomain.com
VITE_SOCKET_URL=https://yourdomain.com
VITE_ENV=production
EOF
```

---

## 🗄️ STEP 2: DEPLOY DATABASE (5 minutes)

### 2.1 Run Migrations
```bash
cd backend

# Set production database URL
export DATABASE_URL="postgresql://noren_user:password@localhost:5432/noren_db_prod"

# Run migrations
npm run migrate

# Verify migrations
npm run migrate:test
```

**Expected Output**:
```
✓ Migration 001_extend_users_table.sql applied
✓ Migration 002_create_messaging_tables.sql applied
✓ Migration 003_create_stories_enhancement_tables.sql applied
✓ Migration 004_create_calls_notifications_tables.sql applied
✓ Migration 005_create_privacy_audit_mention_tables.sql applied
✓ Migration 006_enhance_existing_social_tables.sql applied
✓ All tables verified
✓ All columns verified
✓ All indexes verified
```

### 2.2 Verify Database
```bash
# Connect and check tables
psql -U noren_user -d noren_db_prod -c "\dt src_social*"

# Should list 21 tables
```

---

## 🔧 STEP 3: BUILD AND DEPLOY BACKEND (10 minutes)

### 3.1 Install Dependencies
```bash
cd backend
npm ci --production  # Uses package-lock.json
```

### 3.2 Build Backend
```bash
# Run tests
npm run test
npm run test:security

# No build needed for Node.js, skip to deployment
```

### 3.3 Start Backend as Service
```bash
# Option A: Using systemd (Linux)
sudo tee /etc/systemd/system/noren-backend.service > /dev/null <<EOF
[Unit]
Description=Noren Messaging Backend
After=network.target

[Service]
Type=simple
User=noren
WorkingDirectory=/opt/noren/backend
EnvironmentFile=/opt/noren/backend/.env.production
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable noren-backend
sudo systemctl start noren-backend
sudo systemctl status noren-backend

# Option B: Using PM2 (Any OS)
npm install -g pm2
pm2 start backend/server.js --name "noren-backend" --env production
pm2 save
pm2 startup
pm2 status
```

### 3.4 Verify Backend
```bash
# Wait 5 seconds
sleep 5

# Test API
curl -X GET http://localhost:3000/api/health || curl -X GET http://localhost:3000/api/social/notifications \
  -H "Authorization: Bearer test_token" 2>/dev/null | head -20
```

**Expected**: No connection refused errors

---

## 🎨 STEP 4: BUILD AND DEPLOY FRONTEND (10 minutes)

### 4.1 Install Dependencies
```bash
cd noren-messaging-frontend
npm ci --production
```

### 4.2 Build Frontend
```bash
# Build with production optimizations
npm run build

# Should create dist/ directory
ls -la dist/
```

### 4.3 Deploy Frontend to Web Server

#### Option A: Nginx (Recommended)
```bash
# Create nginx config
sudo tee /etc/nginx/sites-available/noren << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com;
    
    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Frontend files
    root /var/www/noren/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket proxy
    location /socket.io {
        proxy_pass http://localhost:3000/socket.io;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/noren /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Option B: Apache
```bash
# Enable modules
sudo a2enmod rewrite
sudo a2enmod ssl
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel

# Create vhost config
sudo tee /etc/apache2/sites-available/noren.conf > /dev/null <<EOF
<VirtualHost *:443>
    ServerName yourdomain.com
    
    # Frontend
    DocumentRoot /var/www/noren/dist
    <Directory /var/www/noren/dist>
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
    
    # API Proxy
    ProxyPass /api/ http://localhost:3000/api/
    ProxyPassReverse /api/ http://localhost:3000/api/
    
    # WebSocket Proxy
    ProxyPass /socket.io/ ws://localhost:3000/socket.io/
    ProxyPassReverse /socket.io/ ws://localhost:3000/socket.io/
    
    # SSL
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/yourdomain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/yourdomain.com/privkey.pem
</VirtualHost>
EOF

sudo a2ensite noren
sudo apache2ctl configtest
sudo systemctl restart apache2
```

### 4.4 Setup SSL (Let's Encrypt)
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d yourdomain.com -d admin.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

## 🔐 STEP 5: SECURITY HARDENING (10 minutes)

### 5.1 Firewall Configuration
```bash
# Allow only necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 5.2 Fail2Ban Protection
```bash
# Install
sudo apt install fail2ban

# Configure
sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
EOF

sudo systemctl restart fail2ban
```

### 5.3 Database Security
```bash
# Disable remote access
sudo nano /etc/postgresql/13/main/postgresql.conf
# Set: listen_addresses = 'localhost'

sudo systemctl restart postgresql
```

---

## 📊 STEP 6: MONITORING & LOGGING (5 minutes)

### 6.1 Setup Logging
```bash
# Create log directory
sudo mkdir -p /var/log/noren
sudo chown -R noren:noren /var/log/noren
sudo chmod 755 /var/log/noren

# Rotate logs
sudo tee /etc/logrotate.d/noren > /dev/null <<EOF
/var/log/noren/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 noren noren
    sharedscripts
}
EOF
```

### 6.2 Setup Monitoring
```bash
# Install node-exporter for Prometheus
wget https://github.com/prometheus/node_exporter/releases/download/v1.5.0/node_exporter-1.5.0.linux-amd64.tar.gz
tar xvfz node_exporter-1.5.0.linux-amd64.tar.gz
sudo mv node_exporter-1.5.0.linux-amd64/node_exporter /usr/local/bin/

# Create systemd service
sudo tee /etc/systemd/system/node_exporter.service > /dev/null <<EOF
[Unit]
Description=Prometheus Node Exporter
After=network.target

[Service]
Type=simple
User=nobody
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable node_exporter
sudo systemctl start node_exporter
```

---

## ✅ STEP 7: VERIFICATION (10 minutes)

### 7.1 Test All Endpoints
```bash
# Get health check
curl -s https://yourdomain.com/api/health | jq .

# Test authentication
curl -s https://yourdomain.com/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' | jq .

# Test messaging
curl -s https://yourdomain.com/api/social/conversations \
  -H "Authorization: Bearer YOUR_TOKEN" | jq .

# Test WebSocket connection
npm install -g wscat
wscat -c wss://yourdomain.com/socket.io/?transport=websocket
```

### 7.2 Verify Database
```bash
# Check active connections
psql -U noren_user -d noren_db_prod -c "SELECT datname, usename, count(*) FROM pg_stat_activity GROUP BY datname, usename;"

# Check table sizes
psql -U noren_user -d noren_db_prod -c "SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size FROM pg_tables WHERE schemaname='public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

### 7.3 Load Testing
```bash
# Install siege
sudo apt install siege

# Run load test
siege -c 100 -r 10 https://yourdomain.com

# Results should show:
# - Response time < 2s
# - No 500 errors
# - No timeouts
```

### 7.4 Security Scanning
```bash
# Install OWASP ZAP
sudo apt install zaproxy

# Run scan (basic)
zaproxy -cmd -quickurl https://yourdomain.com -quickout /tmp/zap-report.html
```

---

## 🚀 STEP 8: POST-DEPLOYMENT (5 minutes)

### 8.1 Backup Database
```bash
# Create backup directory
sudo mkdir -p /backups/noren
sudo chown -R postgres:postgres /backups/noren

# Create backup script
sudo tee /usr/local/bin/backup-noren.sh > /dev/null <<'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/backups/noren/noren_db_$DATE.sql.gz"

pg_dump -U noren_user noren_db_prod | gzip > $BACKUP_FILE

# Keep only last 30 days
find /backups/noren -type f -mtime +30 -delete

echo "Backup created: $BACKUP_FILE"
EOF

sudo chmod +x /usr/local/bin/backup-noren.sh

# Schedule daily backup
sudo tee /etc/cron.d/noren-backup > /dev/null <<EOF
0 2 * * * /usr/local/bin/backup-noren.sh
EOF
```

### 8.2 Monitor Service Health
```bash
# Check status
sudo systemctl status noren-backend

# View logs
sudo journalctl -u noren-backend -f

# Restart if needed
sudo systemctl restart noren-backend
```

### 8.3 Create Admin User
```bash
# Connect to database
psql -U noren_user -d noren_db_prod

# Create admin
INSERT INTO src_users (email, password, name, role, is_admin) 
VALUES (
  'admin@yourdomain.com',
  'bcrypt_hash_here',
  'Admin User',
  'admin',
  true
);

# Exit
\q
```

---

## 📈 PERFORMANCE TUNING

### Database Optimization
```bash
# Connect to database
psql -U noren_user -d noren_db_prod

-- Analyze query plans
EXPLAIN ANALYZE SELECT * FROM src_social_messages WHERE conversation_id = 1;

-- Update statistics
ANALYZE;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan 
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;
```

### Application Optimization
```bash
# Monitor Node.js process
npm install -g clinic
clinic doctor -- node backend/server.js

# Memory profiling
node --prof backend/server.js
node --prof-process isolate-*.log > profile.txt
```

---

## 🆘 TROUBLESHOOTING

### Database Connection Error
```bash
# Check PostgreSQL running
sudo systemctl status postgresql

# Check connection
psql -U noren_user -d noren_db_prod -c "SELECT version();"

# Restart if needed
sudo systemctl restart postgresql
```

### WebSocket Connection Failed
```bash
# Check port 3000
sudo lsof -i :3000

# Check proxy configuration
sudo nginx -T

# Test proxy
curl -v http://localhost:3000/socket.io/
```

### High Memory Usage
```bash
# Check Node process
ps aux | grep node

# Get heap dump
kill -USR2 <node_pid>

# Analyze heap
node --inspect backend/server.js
```

### Database Lock
```bash
# Find long-running queries
SELECT pid, usename, state, query FROM pg_stat_activity WHERE query != 'idle';

# Kill hanging query
SELECT pg_terminate_backend(pid);
```

---

## 📋 FINAL CHECKLIST

- [ ] Database migrated and verified
- [ ] Backend running without errors
- [ ] Frontend deployed and accessible
- [ ] SSL/HTTPS working
- [ ] API endpoints responding
- [ ] WebSocket connecting
- [ ] Admin panel accessible
- [ ] Monitoring configured
- [ ] Backups scheduled
- [ ] Firewall configured
- [ ] Database backups working
- [ ] Load testing passed
- [ ] Security scan completed
- [ ] Alerting configured
- [ ] Team trained

---

## 🎉 DEPLOYMENT COMPLETE

Your Noren Messaging platform is now live in production!

### Key URLs
- **Platform**: https://yourdomain.com
- **Admin Panel**: https://yourdomain.com/admin
- **API Base**: https://yourdomain.com/api
- **WebSocket**: wss://yourdomain.com/socket.io

### Support
- Monitor logs: `sudo journalctl -u noren-backend -f`
- Check status: `sudo systemctl status noren-backend`
- Restart: `sudo systemctl restart noren-backend`
- Backup: `sudo /usr/local/bin/backup-noren.sh`

---

**Production deployment time: ~1 hour**

Next: Configure monitoring and set up alerts.
