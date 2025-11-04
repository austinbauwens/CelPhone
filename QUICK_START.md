# Quick Start Guide

## ✅ Step 1: Create .env File

Create a file named `.env` in the `frontend` directory with this content:

```env
VITE_SUPABASE_URL=https://uodribvhfxrfndnbhwfs.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvZHJpYnZoZnhyZm5kbmJod2ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxOTcyMzQsImV4cCI6MjA3Nzc3MzIzNH0.tWOba3of9ePs4oKpqsLk86Xj13RUMBR6vtsGdIEobMI
```

## ✅ Step 2: Run Database Migration

1. Go to: https://supabase.com/dashboard/project/uodribvhfxrfndnbhwfs/sql
2. Click **New Query**
3. Copy the ENTIRE contents of `supabase/migrations/001_initial_schema.sql`
4. Paste into the SQL editor
5. Click **Run** (or Ctrl+Enter)
6. You should see "Success. No rows returned"

## ✅ Step 3: Create Storage Bucket

1. Go to: https://supabase.com/dashboard/project/uodribvhfxrfndnbhwfs/storage/buckets
2. Click **Create bucket**
3. Name: `frames`
4. Set to **Public**
5. Click **Create bucket**

## ✅ Step 4: Start the App

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and test it!

