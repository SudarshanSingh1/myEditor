#!/bin/bash
set -e

echo "1. Backing up existing configuration..."
sudo cp -r /etc/nginx/sites-available /etc/nginx/sites-available.bak
sudo cp -r /etc/nginx/sites-enabled /etc/nginx/sites-enabled.bak

echo "2. Removing all duplicate/conflicting configurations..."
sudo rm -f /etc/nginx/sites-enabled/*
sudo rm -f /etc/nginx/sites-available/editor.fitshare.tech*
sudo rm -f /etc/nginx/sites-available/backend.fitshare.tech*
sudo rm -f /etc/nginx/sites-available/fitshare*
sudo rm -f /etc/nginx/sites-available/default

echo "3. Installing the unified configuration..."
sudo cp vps_nginx.conf /etc/nginx/sites-available/fitshare.conf

echo "4. Enabling the configuration..."
sudo ln -s /etc/nginx/sites-available/fitshare.conf /etc/nginx/sites-enabled/fitshare.conf

echo "5. Testing Nginx configuration..."
sudo nginx -t

echo "6. Reloading Nginx..."
sudo systemctl reload nginx

echo "Done! The VPS is now correctly configured to proxy WebSockets."
