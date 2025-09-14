ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view their own subscriptions" ON public.subscriptions
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert their own subscriptions" ON public.subscriptions
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own subscriptions" ON public.subscriptions
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete their own subscriptions" ON public.subscriptions
FOR DELETE TO authenticated USING (auth.uid() = user_id);