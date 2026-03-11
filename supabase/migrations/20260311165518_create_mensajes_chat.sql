create table if not exists public.mensajes_chat (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.mensajes_chat enable row level security;

create policy "Users can view their own messages"
  on public.mensajes_chat for select
  using (auth.uid() = user_id);

create policy "Users can insert their own messages"
  on public.mensajes_chat for insert
  with check (auth.uid() = user_id);
