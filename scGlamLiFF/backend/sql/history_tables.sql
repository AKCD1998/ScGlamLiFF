create table if not exists purchase_history (
  id uuid primary key default gen_random_uuid(),
  line_user_id text not null references line_users(line_user_id) on delete cascade,
  treatment_id uuid not null references treatments(id),
  sessions_bought integer not null,
  price_thb integer,
  purchased_at timestamptz not null default now(),
  expires_at timestamptz,
  note text
);

create index if not exists idx_purchase_history_user_treatment
  on purchase_history(line_user_id, treatment_id);

create table if not exists usage_history (
  id uuid primary key default gen_random_uuid(),
  line_user_id text not null references line_users(line_user_id) on delete cascade,
  treatment_id uuid not null references treatments(id),
  appointment_id text,
  used_at timestamptz not null default now(),
  provider text,
  scrub text,
  facial_mask text,
  misting text,
  extra_price_thb integer,
  note text
);

create index if not exists idx_usage_history_user_treatment
  on usage_history(line_user_id, treatment_id);
