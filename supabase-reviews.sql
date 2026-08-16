-- Таблица отзывов для Supabase (SQL Editor → New query)

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  author_name text not null check (char_length(author_name) between 2 and 50),
  text text not null check (char_length(text) between 10 and 300),
  created_at timestamptz not null default now()
);

alter table reviews enable row level security;

create policy "reviews_select_public"
  on reviews for select
  using (true);

create policy "reviews_insert_public"
  on reviews for insert
  with check (true);

-- Права для сайта (если отключено «Автоматически открывать новые таблицы»)
grant usage on schema public to anon, authenticated;
grant select, insert on table public.reviews to anon, authenticated;
