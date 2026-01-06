-- Add helper functions for subscription validation

-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION public.user_has_active_subscription(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = p_user_id
    AND status = 'active'
    AND (renewal_date IS NULL OR renewal_date > NOW())
  );
END;
$$;

-- Function to get user's active subscription
CREATE OR REPLACE FUNCTION public.get_active_subscription(p_user_id UUID)
RETURNS SETOF public.subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.subscriptions
  WHERE user_id = p_user_id
  AND status = 'active'
  AND (renewal_date IS NULL OR renewal_date > NOW())
  ORDER BY created_at DESC
  LIMIT 1;
END;
$$;

-- Add index for faster subscription lookups
CREATE INDEX IF NOT EXISTS subscriptions_user_status_idx 
ON public.subscriptions (user_id, status) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS subscriptions_renewal_date_idx 
ON public.subscriptions (renewal_date) 
WHERE renewal_date IS NOT NULL;

-- Add comment
COMMENT ON FUNCTION public.user_has_active_subscription IS 'Check if user has an active, non-expired subscription';
COMMENT ON FUNCTION public.get_active_subscription IS 'Get user''s active subscription record';
