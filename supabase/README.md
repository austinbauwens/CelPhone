# Supabase Setup Instructions

## Prerequisites
1. Create a Supabase account at https://supabase.com
2. Create a new project

## Database Setup

1. Navigate to your Supabase project dashboard
2. Go to SQL Editor
3. Run the migration file `001_initial_schema.sql` to create all tables and policies

## Storage Setup

1. Go to Storage in your Supabase dashboard
2. Create a new bucket called `frames`
3. Set bucket to public (or configure RLS policies as needed)
4. Configure CORS settings if needed

## Environment Variables

After setup, copy your Supabase URL and anon key from Settings > API:
- Add `VITE_SUPABASE_URL` to your `.env` file
- Add `VITE_SUPABASE_ANON_KEY` to your `.env` file

## Realtime

Realtime is enabled by default for Supabase. Make sure your tables have the necessary permissions for realtime subscriptions.

