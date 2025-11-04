# Fix Real-time Updates and Database Constraint

## Step 1: Fix Database Constraint (Required)

Run this SQL in your Supabase SQL Editor:

```sql
-- Update games table to allow 'prompt' status
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_status_check;
ALTER TABLE games ADD CONSTRAINT games_status_check 
  CHECK (status IN ('lobby', 'drawing', 'viewing', 'prompt', 'complete'));
```

**How to do this:**
1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/uodribvhfxrfndnbhwfs
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Paste the SQL above
5. Click **Run** (or press Ctrl+Enter)
6. You should see "Success. No rows returned"

## Step 2: Enable Realtime for Players Table (Required)

For real-time updates to work (like Skribbl.io and Gartic Phone), you need to enable Realtime replication for the `players` table:

1. Go to your Supabase dashboard
2. Click **Database** → **Replication** in the left sidebar
3. Find the `players` table in the list
4. Toggle the switch to **ON** (enable replication)
5. Make sure it says "Enabled" next to the table

**Why this is needed:**
- Supabase Realtime requires explicit replication to be enabled for each table
- Without this, the subscriptions won't receive updates
- This is how Skribbl.io and Gartic Phone get instant updates

## Step 3: Test Real-time Updates

1. Open the app in two browser tabs/windows
2. In tab 1: Create a game (you'll be the host)
3. In tab 2: Join the game using the room code
4. **Expected behavior:** The player should appear instantly in the host's player list (tab 1)
5. Check the browser console (F12) - you should see:
   - "Successfully subscribed to player updates"
   - "Player list update received: INSERT" when someone joins

## Troubleshooting

### If players still don't appear in real-time:

1. **Check browser console** - Look for:
   - "Subscription status: SUBSCRIBED" ✅
   - "Subscription status: CHANNEL_ERROR" ❌
   - "Player list update received" messages

2. **Verify Realtime is enabled:**
   - Go to Database → Replication
   - Make sure `players` table shows "Enabled"

3. **Check network tab:**
   - Open DevTools → Network tab
   - Look for WebSocket connections (ws://)
   - Should see connections to Supabase realtime server

4. **Try refreshing:**
   - Sometimes subscriptions need a refresh to reconnect
   - Close and reopen both tabs

### If you see "CHANNEL_ERROR":

- Realtime might not be enabled for your project
- Go to Settings → API → Check that Realtime is enabled
- Or check Database → Replication settings

