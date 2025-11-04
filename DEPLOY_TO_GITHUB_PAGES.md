# Deploying to GitHub Pages

## Automatic Deployment (Recommended)

The project is set up with GitHub Actions for automatic deployment. Every time you push to the `main` branch, it will automatically deploy to GitHub Pages.

### Setup Steps:
1. **Enable GitHub Pages in your repository:**
   - Go to your repository on GitHub
   - Click on **Settings** → **Pages**
   - Under **Source**, select **GitHub Actions**
   - Click **Save**

2. **Add GitHub Secrets:**
   - Go to **Settings** → **Secrets and variables** → **Actions**
   - Add the following secrets:
     - `VITE_SUPABASE_URL` - Your Supabase project URL
     - `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

3. **Trigger deployment:**
   - Push any changes to the `main` branch
   - Or manually trigger via **Actions** → **Deploy to GitHub Pages** → **Run workflow**

Your site will be available at: https://austinbauwens.github.io/CelPhone/

## Manual Deployment (If needed)

If you need to deploy manually, you can use the `gh-pages` CLI:

```bash
cd frontend
npm run build
cd ..
npx gh-pages -d frontend/dist
```

**Important Notes:**
- Never checkout the `gh-pages` branch manually - it only contains built files
- If files disappear, run: `git checkout main && git reset --hard origin/main`
- Always run `gh-pages` from the repository root directory
