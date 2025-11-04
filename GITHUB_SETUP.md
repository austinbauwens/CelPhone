# GitHub Setup Instructions

Your code has been committed to git locally. Follow these steps to push to GitHub and deploy on Vercel:

## Step 1: Create a GitHub Repository

1. Go to https://github.com/new
2. Create a new repository:
   - **Repository name**: `cel-phone` (or any name you prefer)
   - **Description**: "Multiplayer animation game similar to Gartic Phone"
   - **Visibility**: Public or Private (your choice)
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
3. Click "Create repository"

## Step 2: Push to GitHub

After creating the repository, GitHub will show you commands. Use these:

```bash
cd "E:\Cursor Apps\November 3rd"

# Add the remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/cel-phone.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

**Or if you prefer SSH:**

```bash
git remote add origin git@github.com:YOUR_USERNAME/cel-phone.git
git branch -M main
git push -u origin main
```

## Step 3: Deploy to Vercel

Once your code is on GitHub:

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your `cel-phone` repository
4. Configure the project:
   - **Framework Preset**: Vite (auto-detected)
   - **Root Directory**: `frontend` ⚠️ **IMPORTANT**: Set this to `frontend`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)
5. Add Environment Variables:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
6. Click "Deploy"

## Troubleshooting

### Git push fails with authentication
- Use GitHub Personal Access Token instead of password
- Or set up SSH keys: https://docs.github.com/en/authentication/connecting-to-github-with-ssh

### Vercel build fails
- Make sure Root Directory is set to `frontend`
- Check that environment variables are set correctly
- Verify build works locally: `cd frontend && npm run build`

### Environment variables not working
- Make sure they start with `VITE_` prefix
- Redeploy after adding environment variables
- Check Vercel build logs for errors

