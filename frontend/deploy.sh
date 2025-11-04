#!/bin/bash
# Deploy script for GitHub Pages

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please create a .env file with:"
    echo "VITE_SUPABASE_URL=your_supabase_url"
    echo "VITE_SUPABASE_ANON_KEY=your_supabase_key"
    exit 1
fi

# Build the project
echo "Building project..."
npm run build

# Deploy to gh-pages branch
echo "Deploying to GitHub Pages..."
npx gh-pages -d dist

echo "Deployment complete!"
echo "Your site will be live at: https://austinbauwens.github.io/CelPhone/"

