create table if not exists public.kc_communication_push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  expiration_time bigint,
  user_agent text,
  device_label text,
  active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kc_communication_push_devices_endpoint_unique unique(endpoint)
);

create index if not exists kc_communication_push_devices_user_active_idx
  on public.kc_communication_push_devices(user_id, active, updated_at desc);

alter table public.kc_communication_push_devices enable row level security;

revoke all on table public.kc_communication_push_devices from anon, authenticated;
grant select, insert, update, delete on table public.kc_communication_push_devices to service_role;

comment on table public.kc_communication_push_devices is
  'KC Communication-owned Web Push device subscriptions. Access only through authenticated KC Communication edge functions.';
