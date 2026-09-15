-- Teconnect commercial SaaS layer
-- Applied to Supabase project kegmysndcrytlsuclhsq.
-- Canonical billing state lives in subscriptions; Stripe is the payment source of truth.

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null check (code in ('STARTER','BUSINESS','ENTERPRISE')),
  name text not null,
  max_employees integer not null check (max_employees > 0),
  monthly_price_cents bigint not null check (monthly_price_cents >= 0),
  features jsonb not null default '{}'::jsonb,
  stripe_price_id text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  status text not null default 'trial' check (status in ('trial','active','past_due','canceled','incomplete','paused')),
  max_employees integer not null check (max_employees > 0),
  current_period_start timestamptz,
  current_period_end timestamptz,
  renewal_at timestamptz,
  trial_ends_at timestamptz,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_checkout_session_id text,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

insert into public.subscription_plans(code,name,max_employees,monthly_price_cents,features)
values
 ('STARTER','Starter',50,4900,'{"erp":false,"advanced_shifts":false,"predictive_alerts":true,"tasks":true}'::jsonb),
 ('BUSINESS','Business',250,9900,'{"erp":true,"advanced_shifts":true,"predictive_alerts":true,"tasks":true}'::jsonb),
 ('ENTERPRISE','Enterprise',5000,24900,'{"erp":true,"advanced_shifts":true,"predictive_alerts":true,"tasks":true,"sso":true,"custom_integrations":true}'::jsonb)
on conflict (code) do update set max_employees=excluded.max_employees,monthly_price_cents=excluded.monthly_price_cents,features=excluded.features;

alter table public.companies add column if not exists billing_status text;
alter table public.companies add column if not exists billing_blocked boolean not null default false;

-- Seed every existing tenant into the commercial model as a 14-day Starter trial.
insert into public.subscriptions(company_id,plan_id,status,max_employees,trial_ends_at,renewal_at)
select c.id,p.id,'trial',p.max_employees,now()+interval '14 days',now()+interval '14 days'
from public.companies c cross join public.subscription_plans p
where p.code='STARTER' and not exists (select 1 from public.subscriptions s where s.company_id=c.id);

-- Production enforcement: new ACTIVE employees cannot exceed the contracted seat limit
-- and cannot be created while billing is past_due/canceled/incomplete/paused.
create or replace function private.assert_company_can_add_employee(p_company_id uuid)
returns void language plpgsql stable security definer set search_path=public,private as $$
declare s public.subscriptions; active_count integer;
begin
 select * into s from public.subscriptions where company_id=p_company_id;
 if s.id is null then raise exception 'SUBSCRIPTION_REQUIRED'; end if;
 if s.status in ('past_due','canceled','incomplete','paused') then raise exception 'BILLING_PAST_DUE'; end if;
 select count(*) into active_count from public.employees where company_id=p_company_id and status='ACTIVE';
 if active_count >= s.max_employees then raise exception 'PLAN_EMPLOYEE_LIMIT_REACHED'; end if;
end; $$;

create or replace function public.enforce_employee_subscription_limit()
returns trigger language plpgsql security definer set search_path=public,private as $$
begin
 if tg_op='INSERT' or (tg_op='UPDATE' and new.status='ACTIVE' and old.status is distinct from 'ACTIVE') then
   perform private.assert_company_can_add_employee(new.company_id);
 end if;
 return new;
end; $$;

drop trigger if exists trg_employee_subscription_limit on public.employees;
create trigger trg_employee_subscription_limit before insert or update of status on public.employees
for each row execute function public.enforce_employee_subscription_limit();

create or replace function public.has_plan_feature(p_feature text)
returns boolean language sql stable security definer set search_path=public,private as $$
 select coalesce(((splan.features ->> p_feature)::boolean),false)
 from public.subscription_plans splan join public.subscriptions sub on sub.plan_id=splan.id
 where sub.company_id=private.current_profile_company_id() and sub.status in ('trial','active') limit 1;
$$;

create or replace function public.get_my_billing()
returns jsonb language plpgsql stable security definer set search_path=public,private as $$
declare s public.subscriptions; p public.subscription_plans; cid uuid; active_count integer;
begin
 cid:=private.current_profile_company_id(); if cid is null then raise exception 'PROFILE_NOT_FOUND'; end if;
 select * into s from public.subscriptions where company_id=cid; if s.id is null then raise exception 'SUBSCRIPTION_NOT_FOUND'; end if;
 select * into p from public.subscription_plans where id=s.plan_id;
 select count(*) into active_count from public.employees where company_id=cid and status='ACTIVE';
 return jsonb_build_object('company_id',cid,'subscription_id',s.id,'status',s.status,'plan_code',p.code,'plan_name',p.name,'max_employees',s.max_employees,'active_employees',active_count,'usage_percent',round((active_count::numeric/greatest(s.max_employees,1))*100,1),'renewal_at',s.renewal_at,'trial_ends_at',s.trial_ends_at,'cancel_at_period_end',s.cancel_at_period_end,'billing_blocked',s.status in ('past_due','canceled','incomplete','paused') or active_count>=s.max_employees,'features',p.features,'monthly_price_cents',p.monthly_price_cents);
end; $$;

create or replace function public.get_billing_plans()
returns setof public.subscription_plans language sql stable security definer set search_path=public,private as $$
 select * from public.subscription_plans where active=true order by monthly_price_cents;
$$;

alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;
drop policy if exists subscription_plans_read on public.subscription_plans;
create policy subscription_plans_read on public.subscription_plans for select to authenticated using (active=true);
drop policy if exists subscriptions_self_read on public.subscriptions;
create policy subscriptions_self_read on public.subscriptions for select to authenticated using (company_id=private.current_profile_company_id());

grant select on public.subscription_plans to authenticated;
grant select on public.subscriptions to authenticated;
grant execute on function public.get_my_billing() to authenticated;
grant execute on function public.get_billing_plans() to authenticated;
grant execute on function public.has_plan_feature(text) to authenticated;
