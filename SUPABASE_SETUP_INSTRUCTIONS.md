# Supabase Setup Instructions

## ✅ Step 1: Database Migration (Required)

You need to run the SQL migration to create all the database tables.

### Option A: Using Supabase Dashboard (Easiest)

1. Go to your Supabase project: https://supabase.com/dashboard/project/uodribvhfxrfndnbhwfs
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
5. Paste it into the SQL editor
6. Click **Run** (or press Ctrl+Enter)
7. You should see "Success. No rows returned" - this means it worked!

### Option B: Using Supabase CLI (If you have it installed)

```bash
supabase db push
```

## ✅ Step 2: Create Storage Bucket (Required)

1. Go to your Supabase project dashboard
2. Click on **Storage** in the left sidebar
3. Click **Create bucket**
4. Name it: `frames`
5. Set it to **Public** (or configure RLS policies if you prefer)
6. Click **Create bucket**

## ✅ Step 3: Enable Realtime (Required for Live Updates)

1. Go to **Database** → **Replication** in your Supabase dashboard
2. Make sure Realtime is enabled for your project (it should be by default)
3. If not, go to **Settings** → **API** and enable Realtime

## ✅ Step 4: Test the Connection

1. Go to `frontend` directory
2. Run: `npm install` (if you haven't already)
3. Run: `npm run dev`
4. Open http://localhost:5173
5. Try creating a game - if it works, you're all set!

## Troubleshooting

- **"relation does not exist" error**: Make sure you ran the database migration (Step 1)
- **Storage errors**: Make sure you created the `frames` bucket (Step 2)
- **Realtime not working**: Check that Realtime is enabled in your project settings

