-- Bartender AI Chat Schema
-- Stores conversation history and usage tracking for the AI bartender assistant

-- Messages table: stores all chat messages
CREATE TABLE IF NOT EXISTS bartender_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes for performance
  INDEX idx_bartender_messages_user_created (user_id, created_at DESC)
);

-- Usage tracking table: tracks daily message counts for rate limiting
CREATE TABLE IF NOT EXISTS bartender_chat_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one row per user per day
  UNIQUE (user_id, date),

  -- Index for quick lookups
  INDEX idx_bartender_usage_user_date (user_id, date DESC)
);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE bartender_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bartender_chat_usage ENABLE ROW LEVEL SECURITY;

-- Messages: Users can only see their own messages
CREATE POLICY "Users can view their own chat messages"
  ON bartender_chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat messages"
  ON bartender_chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usage: Users can view and modify their own usage
CREATE POLICY "Users can view their own usage"
  ON bartender_chat_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage"
  ON bartender_chat_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage"
  ON bartender_chat_usage FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to clean up old messages (weekly cleanup)
CREATE OR REPLACE FUNCTION cleanup_old_bartender_messages()
RETURNS void AS $$
BEGIN
  -- Delete messages older than 7 days
  DELETE FROM bartender_chat_messages
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE bartender_chat_messages IS 'Stores AI bartender chat conversation history for each user';
COMMENT ON TABLE bartender_chat_usage IS 'Tracks daily message counts for rate limiting';
COMMENT ON FUNCTION cleanup_old_bartender_messages IS 'Automatically deletes chat messages older than 7 days (run weekly)';
