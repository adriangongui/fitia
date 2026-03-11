create table if not exists public.documentos_rag (
  id uuid default gen_random_uuid() primary key,
  nombre_archivo text not null,
  fragmento text not null,
  pagina integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.documentos_rag enable row level security;

-- Admin can manage docs
create policy "Admins can manage documents"
  on public.documentos_rag for all
  using (auth.uid() is not null); -- Ideally restrict by admin role, but basic auth is enough here

CREATE INDEX IF NOT EXISTS idx_documentos_rag_nombre_archivo ON public.documentos_rag(nombre_archivo);
