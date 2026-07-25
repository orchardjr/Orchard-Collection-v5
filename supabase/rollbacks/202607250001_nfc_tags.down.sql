alter publication supabase_realtime drop table public.nfc_tags;

drop function if exists public.scan_nfc_tag(uuid, text);
drop function if exists public.record_nfc_scan(uuid, timestamptz, text);
drop function if exists public.replace_nfc_tag(uuid, uuid, text, text, text);
drop table if exists public.nfc_tags;
drop function if exists public.validate_nfc_tag_resource();
