-- ============================================================
-- MarketHub Pro — Supabase Schema
-- Ruleaza in: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Tabela profiles (legata automat de auth.users)
create table if not exists public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  name                 text,
  plan                 text not null default 'free',        -- 'free' | 'pro' | 'enterprise'
  is_admin             boolean not null default false,
  stripe_customer_id   text unique,
  stripe_subscription_id text unique,
  created_at           timestamptz not null default now()
);

-- 2. Trigger: creeaza automat un profil cand un user se inregistreaza
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, plan, is_admin)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    'free',
    false
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Row Level Security
alter table public.profiles enable row level security;

-- Userii vad si editeaza DOAR propriul profil
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Service role (webhook Stripe) poate actualiza orice profil
-- Acest lucru este gestionat prin SUPABASE_SERVICE_ROLE_KEY in webhook

-- 4. Coloane extra pentru Meta tokens
-- User Token = pentru Ad Library API; Page Token = pentru Instagram/Facebook API
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_access_token text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_user_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_username text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS meta_user_token text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS youtube_channel_id text;

-- ============================================================
-- 5. (Optional) Seteaza contul tau de admin
-- Inlocuieste EMAIL_TAU cu emailul tau real
-- ============================================================
-- update public.profiles
-- set is_admin = true
-- where id = (select id from auth.users where email = 'EMAIL_TAU');
