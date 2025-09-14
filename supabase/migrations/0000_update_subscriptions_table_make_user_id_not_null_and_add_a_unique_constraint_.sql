ALTER TABLE public.subscriptions
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.subscriptions
ADD CONSTRAINT unique_user_subscription UNIQUE (user_id);