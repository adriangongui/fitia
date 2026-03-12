create table if not exists public.entrenamientos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  tipo text not null,
  duracion integer not null,
  intensidad text not null,
  notas text,
  calorias_quemadas integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.entrenamientos enable row level security;

-- Policies
create policy "Users can view their own workouts"
  on public.entrenamientos for select
  using (auth.uid() = user_id);

create policy "Users can insert their own workouts"
  on public.entrenamientos for insert
  with check (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_entrenamientos_user_id ON public.entrenamientos(user_id);
CREATE INDEX IF NOT EXISTS idx_entrenamientos_created_at ON public.entrenamientos(created_at);
