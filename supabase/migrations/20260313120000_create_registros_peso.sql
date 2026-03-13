CREATE TABLE registros_peso (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  peso numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE registros_peso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios solo ven su peso"
ON registros_peso FOR ALL
USING (auth.uid() = user_id);
