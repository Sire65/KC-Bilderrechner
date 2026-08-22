insert into public.kc_communication_programs (id,display_name,status,allowed_channels,permissions)
values (
  'kc-communication-system',
  'KC Communication System',
  'registered',
  array['push','email']::text[],
  jsonb_build_object('canSend',false,'internalTestOnly',true)
)
on conflict (id) do update
set display_name=excluded.display_name,
    status=excluded.status,
    allowed_channels=excluded.allowed_channels,
    permissions=excluded.permissions;
