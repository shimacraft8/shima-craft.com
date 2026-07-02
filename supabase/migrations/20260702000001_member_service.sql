-- 白黒写真カラー化 会員制サービス基盤
-- profiles / colorization_logs / admin_audit_logs / trial_events + RLS
--
-- 認可の考え方:
--  - profiles: 本人は自分の行のみ閲覧。更新・作成・削除はサーバー(Service Role)経由のみ。
--  - colorization_logs: 挿入はサーバーRoute経由のみ(偽造防止)。本人は自分の行を閲覧可、adminは全件。
--  - admin_audit_logs: adminのみ閲覧。挿入はサーバーのみ。UPDATE/DELETEは誰にも許可しない
--    (管理者本人でも画面操作から消せない)。
--  - trial_events: 匿名お試しの利用記録。クライアントからは一切アクセス不可(サーバー専用)。

-- ─────────────────────────────────────────────
-- 型
-- ─────────────────────────────────────────────
create type public.user_role as enum ('admin', 'user');
create type public.account_status as enum ('active', 'suspended', 'deleted');
create type public.contract_status as enum ('active', 'payment_pending', 'unpaid', 'cancelled');

-- ─────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null default '',
  role public.user_role not null default 'user',
  account_status public.account_status not null default 'active',
  -- 既定は利用不可の 'unpaid'（公開サインアップ無効化と合わせた多層防御。
  -- 管理者がユーザー作成時に明示的に契約状態を設定する）
  contract_status public.contract_status not null default 'unpaid',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create index profiles_email_idx on public.profiles (lower(email));
create index profiles_role_status_idx on public.profiles (role, account_status);

comment on table public.profiles is '会員プロフィール。認証情報(パスワード等)はauth.usersにのみ存在し、ここには保存しない。';

-- updated_at 自動更新
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- auth.users 作成時に profiles を自動作成（Service Role での createUser / invite 双方に対応）
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- auth.users のメール変更を profiles に同期
create or replace function public.handle_user_email_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.handle_user_email_updated();

-- admin 判定（RLSポリシーから利用。SECURITY DEFINERでprofilesのRLS再帰を回避）
-- クライアントが送る値には依存せず、JWTのauth.uid()とDBのroleだけで判定する。
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and account_status = 'active'
  );
$$;

-- 最後の有効な管理者を消せないようDB層でも保護する
-- (Service RoleはRLSをバイパスするがトリガーはバイパスできない)
create or replace function public.protect_last_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining integer;
begin
  if old.role = 'admin' and old.account_status = 'active' then
    if tg_op = 'DELETE'
       or new.role <> 'admin'
       or new.account_status <> 'active' then
      select count(*) into remaining
      from public.profiles
      where role = 'admin' and account_status = 'active' and id <> old.id;
      if remaining = 0 then
        raise exception 'LAST_ADMIN_PROTECTED: cannot remove or demote the last active admin';
      end if;
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_last_admin
  before update or delete on public.profiles
  for each row execute function public.protect_last_admin();

-- ─────────────────────────────────────────────
-- colorization_logs（会員の利用ログ。画像そのものは保存しない）
-- ─────────────────────────────────────────────
create table public.colorization_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  event_type text not null check (event_type in (
    'colorize_started',
    'model_download_started',
    'model_download_completed',
    'colorize_succeeded',
    'colorize_failed',
    'colorize_cancelled',
    'download_clicked'
  )),
  status text not null default '' check (char_length(status) <= 32),
  image_width integer check (image_width is null or (image_width >= 0 and image_width <= 100000)),
  image_height integer check (image_height is null or (image_height >= 0 and image_height <= 100000)),
  input_file_size bigint check (input_file_size is null or (input_file_size >= 0 and input_file_size <= 1000000000000)),
  output_width integer check (output_width is null or (output_width >= 0 and output_width <= 100000)),
  output_height integer check (output_height is null or (output_height >= 0 and output_height <= 100000)),
  processing_mode text check (processing_mode is null or processing_mode in ('webgpu', 'wasm')),
  duration_ms integer check (duration_ms is null or (duration_ms >= 0 and duration_ms <= 86400000)),
  error_code text check (error_code is null or char_length(error_code) <= 64),
  browser_name text check (browser_name is null or char_length(browser_name) <= 32),
  device_type text check (device_type is null or device_type in ('mobile', 'tablet', 'desktop', 'unknown')),
  created_at timestamptz not null default now()
);

create index colorization_logs_user_created_idx on public.colorization_logs (user_id, created_at desc);
create index colorization_logs_created_idx on public.colorization_logs (created_at desc);
create index colorization_logs_event_idx on public.colorization_logs (event_type, created_at desc);

comment on table public.colorization_logs is '操作イベントのみ記録。画像データ・ファイル名・Blob URL等は保存しない。挿入はサーバーRoute(Service Role)経由のみ。';

-- ─────────────────────────────────────────────
-- admin_audit_logs（管理者操作の監査ログ）
-- ─────────────────────────────────────────────
create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.profiles (id) on delete set null,
  action text not null check (char_length(action) <= 64),
  target_user_id uuid,
  before_data jsonb,
  after_data jsonb,
  request_id uuid not null,
  ip_hash text check (ip_hash is null or char_length(ip_hash) <= 128),
  user_agent text check (user_agent is null or char_length(user_agent) <= 512),
  created_at timestamptz not null default now()
);

create index admin_audit_logs_created_idx on public.admin_audit_logs (created_at desc);
create index admin_audit_logs_admin_idx on public.admin_audit_logs (admin_user_id, created_at desc);
create index admin_audit_logs_target_idx on public.admin_audit_logs (target_user_id, created_at desc);

comment on table public.admin_audit_logs is 'パスワード・トークン等の秘密はbefore/after_dataへ保存しない。UPDATE/DELETEポリシーなし=画面操作から削除不可。';

-- ─────────────────────────────────────────────
-- trial_events（未会員お試しの利用記録。クライアント直接アクセス不可）
-- ─────────────────────────────────────────────
create table public.trial_events (
  id uuid primary key default gen_random_uuid(),
  cookie_hash text not null check (char_length(cookie_hash) <= 128),
  ip_hash text not null check (char_length(ip_hash) <= 128),
  event_type text not null check (event_type in (
    'trial_started',
    'trial_succeeded',
    'trial_failed',
    'trial_cancelled',
    'trial_download_clicked'
  )),
  processing_mode text check (processing_mode is null or processing_mode in ('webgpu', 'wasm')),
  duration_ms integer check (duration_ms is null or (duration_ms >= 0 and duration_ms <= 86400000)),
  error_code text check (error_code is null or char_length(error_code) <= 64),
  user_agent text check (user_agent is null or char_length(user_agent) <= 512),
  created_at timestamptz not null default now()
);

create index trial_events_cookie_idx on public.trial_events (cookie_hash, event_type, created_at desc);
create index trial_events_ip_idx on public.trial_events (ip_hash, event_type, created_at desc);

comment on table public.trial_events is '未会員お試し(3回)のサーバー側カウント用。個人特定情報はハッシュのみ。';

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.colorization_logs enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.trial_events enable row level security;

-- profiles: 本人は自分の行のみ、adminは全件select
create policy profiles_select_own_or_admin
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or public.is_admin());

-- profiles: 更新・挿入・削除のポリシーは定義しない
-- → 一般ユーザーはrole/account_status/contract_statusを含め一切変更できない。
--   変更はサーバー(Service Role)のServer Action経由のみ。

-- colorization_logs: 本人は自分のログのみ、adminは全件select
create policy colorization_logs_select_own_or_admin
  on public.colorization_logs for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- colorization_logs: insertポリシーなし
-- → クライアントは直接insertできず、サーバーRoute(セッションからuser_idを強制)経由のみ。
--   成功ログ等の偽造をRLS層でも防ぐ。

-- admin_audit_logs: adminのみselect。insert/update/deleteはポリシーなし(サーバー専用・削除不可)
create policy admin_audit_logs_select_admin
  on public.admin_audit_logs for select
  to authenticated
  using (public.is_admin());

-- trial_events: 書き込みポリシーなし(サーバー専用)。閲覧のみadminに許可(ダッシュボード統計用)
create policy trial_events_select_admin
  on public.trial_events for select
  to authenticated
  using (public.is_admin());

-- ─────────────────────────────────────────────
-- テーブル権限（GRANT）
-- 新しいSupabase環境は public スキーマへの既定DML付与を行わないため明示する。
-- 実際の行アクセスは上記RLSが制御する（GRANTはテーブル単位の上限）。
-- anon には一切付与しない（未ログインからのDBアクセスは全面拒否）。
-- ─────────────────────────────────────────────
grant select on public.profiles to authenticated;
grant select on public.colorization_logs to authenticated;
grant select on public.admin_audit_logs to authenticated;
grant select on public.trial_events to authenticated;

grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.colorization_logs to service_role;
grant select, insert on public.admin_audit_logs to service_role;
grant select, insert, update, delete on public.trial_events to service_role;
