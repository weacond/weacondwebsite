-- Supabase 数据库初始化
-- 在 https://supabase.com → 你的项目 → SQL Editor 执行

-- 1. 电子书购买记录（单本 + 套装）
create table if not exists public.purchases (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  book_slug text not null,
  stripe_payment_id text,
  stripe_product_id text,
  amount_cents int default 0,
  created_at timestamptz default now(),
  -- 套装购买：book_slug = 'bundle-all' 表示购买了全套 25 本
  is_bundle boolean default false
);

-- 索引
create index if not exists idx_purchases_email on public.purchases(email);
create index if not exists idx_purchases_slug on public.purchases(book_slug);
create unique index if not exists uq_purchases_email_slug on public.purchases(email, book_slug);

-- 2. RLS：默认禁止 anon/authenticated 直接读 purchases。
--    购买校验一律走下面的 check_purchase() 函数（SECURITY DEFINER，按 email+slug 精确判定，
--    只返回布尔值，不暴露任何行数据）。
alter table public.purchases enable row level security;

-- 删除历史遗留的全开放策略：
--   "for select using (true)" 会让任何拿到 anon key（anon key 是公开的）的人枚举全部购买记录，
--   属隐私漏洞。这里不创建任何 select 策略 → anon 无法直接查询 purchases（安全）。
drop policy if exists "users_view_own_purchases" on public.purchases;
-- 写入走 service_role key（webhook），绕过 RLS，正常插入；唯一索引 (email,book_slug) 保证幂等。

-- 3. 购买校验函数：anon 可调用、返回布尔值；SECURITY DEFINER 以 owner 身份读表，
--    因此既不让 anon 直接读表，又能精确判定"该 email 是否拥有该 book"。
--    套装：is_bundle=true 或 book_slug='bundle-all' 视为拥有全部 25 本。
create or replace function public.check_purchase(p_email text, p_slug text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.purchases
    where email = p_email
      and (book_slug = p_slug or is_bundle = true or book_slug = 'bundle-all')
  );
$$;

-- 3. 订阅记录（如需要订阅制）
create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  plan text not null,
  status text default 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 订阅表 RLS：默认禁止 anon 直接读（与 purchases 一致，避免枚举）。
-- 未来若订阅页要读自己的订阅，请加 SECURITY DEFINER 函数或 authenticated-only 策略。
alter table public.subscriptions enable row level security;
drop policy if exists "users_view_own_subs" on public.subscriptions;
-- 不创建任何 select 策略 → anon 无法直接查询 subscriptions（安全）。

-- 4. 触发器：更新 updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_subscriptions_updated on public.subscriptions;
create trigger trigger_subscriptions_updated
  before update on public.subscriptions
  for each row execute function update_updated_at();