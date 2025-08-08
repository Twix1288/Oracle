-- Wipe all demo/backend data and seed a single launch lead access code
begin;

-- Truncate all application tables and reset identities
truncate table public.messages restart identity cascade;
truncate table public.oracle_logs restart identity cascade;
truncate table public.builder_onboarding restart identity cascade;
truncate table public.mentor_profiles restart identity cascade;
truncate table public.events restart identity cascade;
truncate table public.documents restart identity cascade;
truncate table public.team_status restart identity cascade;
truncate table public.updates restart identity cascade;
truncate table public.builder_assignments restart identity cascade;
truncate table public.access_codes restart identity cascade;
truncate table public.members restart identity cascade;
truncate table public.teams restart identity cascade;

-- Seed a single access code for the Lead role
insert into public.access_codes (code, role, description, is_active, generated_by)
values ('lead2025', 'lead', 'Launch lead access', true, 'launch-setup');

commit;