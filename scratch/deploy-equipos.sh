#!/bin/bash
source /home/cristian/.nvm/nvm.sh

PROJECT_DIR="/home/cristian/luke-equipos"
LOG_FILE="/home/cristian/deploy/deploy-equipos.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "========================================" >> "$LOG_FILE"
echo "[$TIMESTAMP] Luke Equipos Deploy started" >> "$LOG_FILE"

cd "$PROJECT_DIR" || exit 1

# Pull latest changes
echo "[$TIMESTAMP] Pulling from origin main..." >> "$LOG_FILE"
/usr/bin/git pull origin main >> "$LOG_FILE" 2>&1
if [ $? -ne 0 ]; then
    echo "[$TIMESTAMP] ERROR: git pull failed" >> "$LOG_FILE"
    exit 1
fi

# Instalar dependencias si cambió package.json de la raíz o de wa-bridge
if /usr/bin/git diff HEAD@{1} HEAD --name-only 2>/dev/null | grep -q "package.json"; then
    echo "[$TIMESTAMP] package.json changed, running npm install..." >> "$LOG_FILE"
    npm install >> "$LOG_FILE" 2>&1
    if [ $? -ne 0 ]; then
        echo "[$TIMESTAMP] ERROR: npm install failed" >> "$LOG_FILE"
        exit 1
    fi
    
    echo "[$TIMESTAMP] Running npm install in wa-bridge..." >> "$LOG_FILE"
    cd "$PROJECT_DIR/wa-bridge" && npm install >> "$LOG_FILE" 2>&1
    cd "$PROJECT_DIR"
fi

# Build de Next.js
echo "[$TIMESTAMP] Building Next.js app..." >> "$LOG_FILE"
npm run build >> "$LOG_FILE" 2>&1
if [ $? -ne 0 ]; then
    echo "[$TIMESTAMP] ERROR: npm run build failed" >> "$LOG_FILE"
    exit 1
fi

# Reiniciar PM2
echo "[$TIMESTAMP] Restarting PM2 processes..." >> "$LOG_FILE"
pm2 restart luke-equipos-prod >> "$LOG_FILE" 2>&1
pm2 restart luke-equipos-wa-bridge >> "$LOG_FILE" 2>&1

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$TIMESTAMP] Luke Equipos Deploy SUCCESS" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"
