-- Supabase SQL Editor에서 한 번 실행하세요. 재실행해도 기존 경기 기록은 유지됩니다.
create table if not exists public.playday_state (
  id integer primary key check (id = 1),
  state jsonb not null,
  version bigint not null default 0 check (version >= 0),
  share text not null unique
);
alter table public.playday_state enable row level security;
-- 교사/학생 브라우저에서 DB로 직접 접근하지 않습니다.
-- 서버만 secret key로 읽고 쓰며, 학생에게 필요한 정보만 따로 반환합니다.
revoke all on public.playday_state from anon, authenticated;
grant select, insert, update on public.playday_state to service_role;
