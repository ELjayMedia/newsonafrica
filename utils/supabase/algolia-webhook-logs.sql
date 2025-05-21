-- Check if the table already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'algolia_webhook_logs') THEN
    -- Create the webhook logs table
    CREATE TABLE public.algolia_webhook_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      action TEXT NOT NULL,
      post_id TEXT NOT NULL,
      status TEXT NOT NULL,
      details TEXT,
      processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Add RLS policies
    ALTER TABLE public.algolia_webhook_logs ENABLE ROW LEVEL SECURITY;

    -- Allow admins to view logs
    CREATE POLICY "Allow admins to view webhook logs" 
      ON public.algolia_webhook_logs 
      FOR SELECT 
      TO authenticated 
      USING (
        auth.uid() IN (
          SELECT auth.uid() FROM auth.users
          WHERE auth.jwt() ->> 'role' = 'admin'
        )
      );

    -- Allow the service to insert logs
    CREATE POLICY "Allow service to insert webhook logs" 
      ON public.algolia_webhook_logs 
      FOR INSERT 
      TO authenticated 
      WITH CHECK (true);

    -- Create index for faster queries
    CREATE INDEX idx_webhook_logs_created_at ON public.algolia_webhook_logs(created_at DESC);
    CREATE INDEX idx_webhook_logs_action ON public.algolia_webhook_logs(action);
    CREATE INDEX idx_webhook_logs_status ON public.algolia_webhook_logs(status);

    RAISE NOTICE 'Created algolia_webhook_logs table and policies';
  ELSE
    RAISE NOTICE 'algolia_webhook_logs table already exists';
  END IF;
END
$$;
