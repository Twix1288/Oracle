-- Enable pgvector for semantic search
create extension if not exists vector;

-- Mentor profiles capturing skills/industries for matching
create table if not exists public.mentor_profiles (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  skills text[] not null default '{}',
  industries text[] not null default '{}',
  strengths text,
  bio text,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mentor_profiles enable row level security;

-- Permissive policies (aligning with current project policies)
create policy if not exists "Allow public insert access to mentor_profiles"
  on public.mentor_profiles for insert with check (true);
create policy if not exists "Allow public read access to mentor_profiles"
  on public.mentor_profiles for select using (true);
create policy if not exists "Allow public update access to mentor_profiles"
  on public.mentor_profiles for update using (true);

-- Builder onboarding capturing project domain & needs for personalization
create table if not exists public.builder_onboarding (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  builder_member_id uuid references public.members(id) on delete set null,
  project_domain text,
  current_challenges text[] default '{}',
  goals text[] default '{}',
  tech_stack text[] default '{}',
  notes text,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.builder_onboarding enable row level security;

create policy if not exists "Allow public insert access to builder_onboarding"
  on public.builder_onboarding for insert with check (true);
create policy if not exists "Allow public read access to builder_onboarding"
  on public.builder_onboarding for select using (true);
create policy if not exists "Allow public update access to builder_onboarding"
  on public.builder_onboarding for update using (true);

-- Update timestamps triggers
create trigger if not exists update_mentor_profiles_updated_at
before update on public.mentor_profiles
for each row execute function public.update_updated_at_column();

create trigger if not exists update_builder_onboarding_updated_at
before update on public.builder_onboarding
for each row execute function public.update_updated_at_column();

-- Add embeddings to documents for RAG if missing
alter table public.documents
  add column if not exists embedding vector(1536);

-- Vector indexes for fast similarity search
create index if not exists idx_mentor_profiles_embedding on public.mentor_profiles using ivfflat (embedding vector_cosine_ops) with (lists=100);
create index if not exists idx_builder_onboarding_embedding on public.builder_onboarding using ivfflat (embedding vector_cosine_ops) with (lists=100);
create index if not exists idx_documents_embedding on public.documents using ivfflat (embedding vector_cosine_ops) with (lists=100);

-- Realtime: ensure full row data and publication (optional but helpful)
alter table public.messages replica identity full;
alter table public.updates replica identity full;
alter table public.mentor_profiles replica identity full;
alter table public.builder_onboarding replica identity full;

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.updates;
alter publication supabase_realtime add table public.mentor_profiles;
alter publication supabase_realtime add table public.builder_onboarding;