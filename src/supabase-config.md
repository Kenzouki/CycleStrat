# Supabase Setup Instructions

## Step 1: Create Supabase Project
1. Go to https://app.supabase.com
2. Click "New Project"
3. Choose your organization
4. Enter project name: "labouchere-app"
5. Enter database password (save this!)
6. Choose region (closest to you)
7. Click "Create new project"

## Step 2: Get Your Credentials
1. Go to Settings > API
2. Copy your Project URL (looks like: https://xxxxx.supabase.co)
3. Copy your anon/public key (starts with: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...)

## Step 3: Update Configuration
1. Open `src/supabase.ts`
2. Replace `YOUR_SUPABASE_URL` with your Project URL
3. Replace `YOUR_SUPABASE_ANON_KEY` with your anon key

## Step 4: Create Database Table
Run this SQL in your Supabase SQL Editor:

```sql
-- Create sessions table
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only access their own sessions
CREATE POLICY "Users can only access their own sessions" ON sessions
  FOR ALL USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_updated_at_idx ON sessions(updated_at DESC);
```

## Step 5: Test
1. Start your app with `npm run dev`
2. Click the cloud icon in the header
3. Sign up with an email and password
4. Your sessions will now sync to the cloud!

Your Supabase project will have:
- User authentication built-in
- Secure database storage
- Real-time capabilities (for future features)
- 2GB free storage
- Up to 50MB database size on free tier