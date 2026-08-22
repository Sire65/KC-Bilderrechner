create table if not exists public.kc_communication_providers (
  id text primary key,
  channel text not null check (channel in ('push','email','sms','whatsapp')),
  provider_key text not null,
  display_name text not null,
  status text not null default 'prepared' check (status in ('active','prepared','disabled','error')),
  direction text not null default 'outbound' check (direction in ('inbound','outbound','both')),
  secret_refs jsonb not null default '[]'::jsonb,
  public_config jsonb not null default '{}'::jsonb,
  source_system text,
  source_reference text,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kc_communication_programs (
  id text primary key,
  display_name text not null,
  status text not null default 'planned' check (status in ('planned','registered','active','disabled')),
  allowed_channels text[] not null default '{}'::text[],
  permissions jsonb not null default '{}'::jsonb,
  secret_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kc_communication_templates (
  id text primary key,
  display_name text not null,
  channel_variants jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kc_communication_requests (
  id uuid primary key default gen_random_uuid(),
  source_program text,
  channel text not null check (channel in ('push','email','sms','whatsapp','auto')),
  template_id text,
  recipient_refs jsonb not null default '[]'::jsonb,
  variables jsonb not null default '{}'::jsonb,
  priority text not null default 'normal' check (priority in ('low','normal','high','critical')),
  scheduled_for timestamptz,
  fallback_channel text,
  status text not null default 'queued' check (status in ('queued','processing','sent','partially_sent','failed','cancelled')),
  provider_id text,
  provider_message_id text,
  retry_count integer not null default 0,
  error_code text,
  error_detail text,
  audit_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  sent_at timestamptz
);

create index if not exists kc_communication_requests_status_idx on public.kc_communication_requests(status, scheduled_for, created_at);
create index if not exists kc_communication_requests_source_idx on public.kc_communication_requests(source_program, created_at desc);

alter table public.kc_communication_providers enable row level security;
alter table public.kc_communication_programs enable row level security;
alter table public.kc_communication_templates enable row level security;
alter table public.kc_communication_requests enable row level security;

comment on table public.kc_communication_providers is 'KC Communication provider registry. Never stores raw provider secrets; only secret references and non-sensitive public configuration.';
comment on table public.kc_communication_programs is 'KC programs allowed to submit communication jobs. No program is activated by this migration.';
comment on table public.kc_communication_requests is 'Central communication queue and delivery audit. Provider dispatch will be added through server-side adapters.';
