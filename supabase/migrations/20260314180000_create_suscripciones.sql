CREATE TABLE suscripciones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL,
  stripe_subscription_id text NOT NULL,
  plan text NOT NULL CHECK (plan IN ('free', 'pro')),
  status text NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE suscripciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios solo ven suscripciones propias"
ON suscripciones FOR ALL
USING (auth.uid() = user_id);
