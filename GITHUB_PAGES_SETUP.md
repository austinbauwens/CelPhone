# GitHub Pages Deployment Setup

GitHub Pages can work for this project! Here's how to set it up:

## Step 1: Enable GitHub Pages in Repository Settings

1. Go to your repository: https://github.com/austinbauwens/CelPhone
2. Click **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions**
4. Click **Save**

## Step 2: Add Environment Variables as GitHub Secrets

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add these secrets:
   - **Name**: `VITE_SUPABASE_URL`
     - **Value**: Your Supabase project URL (e.g., `https://xxxxxxxxxxxxx.supabase.co`)
   - **Name**: `VITE_SUPABASE_ANON_KEY`
     - **Value**: Your Supabase anon/public key

## Step 3: Push the Deployment Workflow

The workflow file has been created at `.github/workflows/deploy.yml`. Just push it:

```bash
cd "E:\Cursor Apps\November 3rd"
git add .
git commit -m "Add GitHub Pages deployment workflow"
git push
```

## Step 4: Wait for Deployment

1. Go to the **Actions** tab in your GitHub repository
2. The workflow will run automatically on push to `main`
3. Once complete, your site will be live at:
   ```
   https://austinbauwens.github.io/CelPhone/
   ```

## Important Notes

- **Base Path**: The app is configured to work with the `/CelPhone/` base path
- **Automatic Deploys**: Every push to `main` will trigger a new deployment
- **Environment Variables**: Must be set as GitHub Secrets (not regular variables)
- **Build Time**: Takes a few minutes to build and deploy

## Troubleshooting

### Build fails
- Check Actions tab for error logs
- Verify GitHub Secrets are set correctly
- Make sure the workflow file is in `.github/workflows/deploy.yml`

### Site shows 404
- Verify GitHub Pages is enabled in Settings → Pages
- Check that the base path in `vite.config.ts` matches your repository name
- Wait a few minutes after deployment for changes to propagate

### Environment variables not working
- Make sure they're set as GitHub Secrets (not variables)
- Secrets must start with `VITE_` prefix
- Redeploy after adding new secrets

## Custom Domain (Optional)

If you want to use a custom domain:

1. Add a `CNAME` file to `frontend/public/` with your domain
2. Update `vite.config.ts` to use `/` as base path (remove `/CelPhone/`)
3. Configure DNS settings as per GitHub Pages documentation

