-- ═══════════════════════════════════════════════
-- MARKETHUB PRO v4 — 7 tabele noi
-- ═══════════════════════════════════════════════

-- 1. PROJECTS
create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  client_id   uuid references agency_clients(id) on delete set null,
  name        text not null,
  objective   text,
  status      text default 'active'
              check (status in ('active','completed','archived')),
  start_date  date default current_date,
  deadline    date,
  platforms   text[] default '{}',
  color       text default '#f59e0b',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists idx_projects_user on projects(user_id);
create index if not exists idx_projects_status on projects(status);

-- 2. WORKFLOW_SESSIONS
create table if not exists workflow_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  project_id   uuid references projects(id) on delete set null,
  agent_type   text not null,
  mode         text not null
               check (mode in ('auto','semi','guided')),
  status       text default 'active'
               check (status in ('active','completed','abandoned')),
  steps        jsonb default '[]',
  result       jsonb,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index if not exists idx_sessions_user on workflow_sessions(user_id);

-- 3. CONTENT_HASHES
create table if not exists content_hashes (
  id           uuid primary key default gen_random_uuid(),
  hash         text not null unique,
  content_type text not null,
  used_at      timestamptz default now(),
  expires_at   timestamptz default now() + interval '30 days',
  user_id      uuid references auth.users(id) on delete cascade
);
create index if not exists idx_hashes_hash on content_hashes(hash);
create index if not exists idx_hashes_expires on content_hashes(expires_at);

-- 4. CAMPAIGN_RESULTS
create table if not exists campaign_results (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade,
  session_id     uuid references workflow_sessions(id),
  project_id     uuid references projects(id) on delete set null,
  agent_type     text not null,
  platform       text not null,
  niche          text,
  winning_tone   text,
  winning_format text,
  winning_timing text,
  best_sound_id  text,
  reach          integer default 0,
  engagement_pct float default 0,
  conversions    integer default 0,
  is_success     boolean default false,
  created_at     timestamptz default now()
);
create index if not exists idx_results_user on campaign_results(user_id);
create index if not exists idx_results_niche on campaign_results(niche);

-- 5. USER_BRAIN_PROFILES
create table if not exists user_brain_profiles (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid references auth.users(id)
                       on delete cascade unique,
  preferred_tone       text,
  preferred_format     text,
  preferred_platforms  text[] default '{}',
  best_posting_times   jsonb default '{}',
  niche                text,
  industry             text,
  geo                  text default 'RO',
  avg_engagement_pct   float default 0,
  total_campaigns      integer default 0,
  successful_campaigns integer default 0,
  learning_confidence  float default 0,
  custom_prefs         jsonb default '{}',
  last_updated         timestamptz default now()
);

-- 6. PLATFORM_BRAIN
create table if not exists platform_brain (
  id                uuid primary key default gen_random_uuid(),
  niche             text not null,
  platform          text not null,
  geo               text default 'global',
  winning_patterns  jsonb default '[]',
  failing_patterns  jsonb default '[]',
  best_times        jsonb default '{}',
  trending_formats  text[] default '{}',
  sample_size       integer default 0,
  confidence        float default 0,
  updated_at        timestamptz default now(),
  unique(niche, platform, geo)
);

-- 7. BRAND_CUSTOMIZATION
create table if not exists brand_customization (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id)
                  on delete cascade unique,
  logo_url        text,
  brand_name      text,
  primary_color   text default '#f59e0b',
  accent_color    text default '#fbbf24',
  custom_domain   text,
  email_sender    text,
  custom_footer   text,
  updated_at      timestamptz default now()
);

-- ═══════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════
alter table projects              enable row level security;
alter table workflow_sessions     enable row level security;
alter table content_hashes        enable row level security;
alter table campaign_results      enable row level security;
alter table user_brain_profiles   enable row level security;
alter table brand_customization   enable row level security;

create policy "Users own projects"
  on projects for all using (auth.uid() = user_id);
create policy "Users own sessions"
  on workflow_sessions for all using (auth.uid() = user_id);
create policy "Users own hashes"
  on content_hashes for all using (auth.uid() = user_id);
create policy "Users own results"
  on campaign_results for all using (auth.uid() = user_id);
create policy "Users own brain"
  on user_brain_profiles for all using (auth.uid() = user_id);
create policy "Users own brand"
  on brand_customization for all using (auth.uid() = user_id);

alter table platform_brain enable row level security;
create policy "Platform brain readable"
  on platform_brain for select using (true);
