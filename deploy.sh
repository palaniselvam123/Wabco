#!/bin/bash
# WABCO Logistics Dashboard — redeploy to Netlify
# Run this whenever you update the app: bash deploy.sh

set -e
cd "$(dirname "$0")"

echo "Building..."
npm run build

echo "Deploying to Netlify..."
netlify deploy --dir=dist --prod

echo ""
echo "Done! Live at: https://wabco-logistics-dashboard.netlify.app"
