# Cel Phone Setup Guide

## Prerequisites

1. Node.js 18+ installed
2. A Supabase account (create one at https://supabase.com)

## Local Development Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at https://supabase.com
2. Go to SQL Editor in your Supabase dashboard
3. Run the migration file from `supabase/migrations/001_initial_schema.sql`
4. Go to Storage and create a new bucket named `frames` (make it public or configure RLS as needed)

### 3. Configure Environment Variables

Create a `.env` file in the `frontend` directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase project settings under API.

### 4. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

## Features

- ✅ Lobby system with room codes
- ✅ Real-time player updates
- ✅ Configurable frames per round (2, 3, or 4)
- ✅ 3-minute drawing timer
- ✅ Canvas drawing with brush and eraser tools
- ✅ Color picker and brush size control
- ✅ Animation playback at 4fps
- ✅ Client-side GIF generation and download
- ✅ Real-time game state synchronization

## Troubleshooting

- If Supabase connection fails, check your environment variables
- Make sure you've run the database migration
- Ensure the Storage bucket is created and configured properly
- Check browser console for any errors

