# Deploy to GitHub Pages from Branch

Simple branch-based deployment for GitHub Pages.

## Step 1: Build and Deploy

Run this command from the frontend directory:

```bash
cd frontend
npm install
npm run build
```

## Step 2: Configure GitHub Pages

1. Go to: https://github.com/austinbauwens/CelPhone/settings/pages
2. Under **Source**, select **Deploy from a branch**
3. Select **Branch**: `gh-pages`
4. Select **Folder**: `/ (root)`
5. Click **Save**

## Step 3: Push the dist folder

After building, push the dist folder to the gh-pages branch:

```bash
cd frontend
cd dist
git init
git add .
git commit -m "Deploy to GitHub Pages"
git branch -M gh-pages
git remote add origin https://github.com/austinbauwens/CelPhone.git
git push -u origin gh-pages --force
```

Or use the automated script:

```bash
cd frontend
npm run deploy
```

## Automated Deployment Script

I've added a `deploy` script to `package.json`. After setting up gh-pages branch once, you can just run:

```bash
cd frontend
npm run deploy
```

This will:
1. Build your app
2. Push the dist folder to the gh-pages branch
3. GitHub Pages will automatically update

## Environment Variables

For branch-based deployment, you'll need to set environment variables when building locally:

1. Create a `.env` file in the `frontend` folder:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   ```

2. Build with these variables set:
   ```bash
   npm run build
   ```

3. Then deploy:
   ```bash
   npm run deploy
   ```

## Important Notes

- The `.env` file should NOT be committed to git (it's in .gitignore)
- Build locally with your environment variables
- The gh-pages branch contains only the built files
- Your site will be live at: https://austinbauwens.github.io/CelPhone/

