# Deployment Guide for Vercel

This guide will help you deploy the Cel Phone frontend to Vercel.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. A GitHub account (or GitLab/Bitbucket)
3. Your Supabase project URL and anon key

## Step 1: Push to GitHub

1. Initialize git repository (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Create a new repository on GitHub

3. Push your code:
   ```bash
   git remote add origin <your-github-repo-url>
   git branch -M main
   git push -u origin main
   ```

## Step 2: Deploy to Vercel

### Option A: Via Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend` (IMPORTANT: Set this to `frontend` since your code is in a subdirectory)
   - **Build Command**: `npm run build` (Vercel will auto-detect this)
   - **Output Directory**: `dist` (Vercel will auto-detect this)
   - **Install Command**: `npm install` (Vercel will auto-detect this)

4. Add Environment Variables:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key

5. Click "Deploy"

### Option B: Via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Navigate to frontend directory:
   ```bash
   cd "E:\Cursor Apps\November 3rd\frontend"
   ```

4. Deploy:
   ```bash
   vercel
   ```

5. Follow the prompts and add environment variables when asked

## Step 3: Environment Variables

Make sure to add these environment variables in Vercel:

1. Go to your project settings in Vercel
2. Navigate to "Environment Variables"
3. Add:
   - `VITE_SUPABASE_URL`: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon/public key

4. Make sure to add them for all environments (Production, Preview, Development)

## Step 4: Verify Deployment

After deployment:

1. Visit your Vercel deployment URL
2. Test the application:
   - Create a game
   - Join a game
   - Test drawing functionality
   - Test GIF download

## Important Notes

- The `gif.worker.js` file is in the `frontend/public` folder and will be automatically served by Vercel
- Make sure your Supabase project has the correct database tables and policies set up
- The app uses client-side rendering, so all routes are handled by the SPA router

## Troubleshooting

### Build fails
- Check that all dependencies are in `package.json`
- Verify the build command works locally: `cd frontend && npm run build`

### Environment variables not working
- Make sure they start with `VITE_` prefix
- Redeploy after adding new environment variables
- Check Vercel logs for any errors

### GIF download not working
- Verify `gif.worker.js` is in `frontend/public` folder
- Check browser console for worker errors

### Database connection issues
- Verify Supabase URL and key are correct
- Check Supabase project is active
- Verify RLS policies allow public access

## Custom Domain

To add a custom domain:

1. Go to your project settings in Vercel
2. Navigate to "Domains"
3. Add your domain
4. Follow DNS configuration instructions

