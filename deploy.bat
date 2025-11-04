@echo off
REM Simple deployment script for GitHub Pages
REM This script builds the frontend and deploys to gh-pages branch

echo Building frontend...
cd frontend
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Build failed!
    exit /b 1
)

echo.
echo Deploying to GitHub Pages...
cd ..
call npx gh-pages -d frontend/dist --message "Deploy latest build to GitHub Pages"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Deployment failed!
    exit /b 1
)

echo.
echo Deployment complete!
echo Your site will be live at: https://austinbauwens.github.io/CelPhone/
echo.
echo Note: Your source files are still on the main branch.
echo The gh-pages branch only contains the built files.

