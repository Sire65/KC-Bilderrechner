-- KC Communication: zero-cost fallback policy
alter table public.kc_communication_settings
  add column if not exists zero_cost_only boolean not null default true,
  add column if not exists channel_order text[] not null default array['push','email','whatsapp','sms']::text[],
  add column if not exists paid_channels_allowed text[] not null default '{}'::text[];

-- WhatsApp/SMS are intentionally prepared but cost-locked.
-- Productive routing order: Push -> Email -> WhatsApp -> SMS.
-- With zero_cost_only=true, only providers marked public_config.zeroCost=true are eligible.
