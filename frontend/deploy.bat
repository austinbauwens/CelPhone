@echo off
REM Deploy script for GitHub Pages (Windows)

REM Check if .env file exists
if not exist .env (
    echo Error: .env file not found!
    echo Please create a .env file with:
    echo VITE_SUPABASE_URL=your_supabase_url
    echo VITE_SUPABASE_ANON_KEY=your_supabase_key
    exit /b 1
)

REM Build the project
echo Building project...
call npm run build

REM Deploy to gh-pages branch
echo Deploying to GitHub Pages...
call npx gh-pages -d dist

echo Deployment complete!
echo Your site will be live at: https://austinbauwens.github.io/CelPhone/

