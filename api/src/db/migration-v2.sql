-- Forvm schema: private team knowledge base
-- Use this as the initial schema for fresh Supabase projects.

create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists public.entries (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    context text not null,
    body text not null,
    tags text[] not null default '{}',
    source text not null check (source in ('human', 'agent', 'human_prompted_agent')),
    reviewed boolean not null default true,
    reviewed_by uuid references auth.users(id) on delete set null,
    reviewed_at timestamptz,
    author_user_id uuid not null references auth.users(id) on delete cascade,
    author_agent_name text,
    embedding vector(1536),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create or replace function public.set_entries_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists entries_set_updated_at on public.entries;
create trigger entries_set_updated_at
before update on public.entries
for each row
execute function public.set_entries_updated_at();

create index if not exists entries_tags_gin_idx on public.entries using gin(tags);
create index if not exists entries_unreviewed_idx on public.entries(created_at asc) where reviewed = false;
create index if not exists entries_author_user_id_idx on public.entries(author_user_id);
create index if not exists entries_created_at_desc_idx on public.entries(created_at desc);

create table if not exists public.agent_keys (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    key_hash text not null unique,
    label text not null,
    created_at timestamptz not null default now()
);

create index if not exists agent_keys_key_hash_idx on public.agent_keys(key_hash);
create index if not exists agent_keys_user_id_idx on public.agent_keys(user_id);

create or replace function public.match_entries(
    query_embedding vector(1536),
    match_threshold float default 0.3,
    match_count int default 10,
    filter_tags text[] default null
)
returns table (
    id uuid,
    title text,
    context text,
    body text,
    tags text[],
    source text,
    reviewed boolean,
    reviewed_by uuid,
    reviewed_at timestamptz,
    author_user_id uuid,
    author_agent_name text,
    created_at timestamptz,
    updated_at timestamptz,
    similarity float
)
language sql
stable
as $$
    select
        entries.id,
        entries.title,
        entries.context,
        entries.body,
        entries.tags,
        entries.source,
        entries.reviewed,
        entries.reviewed_by,
        entries.reviewed_at,
        entries.author_user_id,
        entries.author_agent_name,
        entries.created_at,
        entries.updated_at,
        1 - (entries.embedding <=> query_embedding) as similarity
    from public.entries
    where
        entries.embedding is not null
        and 1 - (entries.embedding <=> query_embedding) > match_threshold
        and (
            filter_tags is null
            or cardinality(filter_tags) = 0
            or entries.tags && filter_tags
        )
    order by entries.embedding <=> query_embedding
    limit match_count;
$$;

grant execute on function public.match_entries(vector, float, int, text[]) to authenticated;

alter table public.entries enable row level security;
alter table public.agent_keys enable row level security;

drop policy if exists entries_select_authenticated on public.entries;
drop policy if exists entries_insert_authenticated on public.entries;
drop policy if exists entries_update_authenticated on public.entries;
drop policy if exists entries_delete_authenticated on public.entries;

create policy entries_select_authenticated
on public.entries
for select
to authenticated
using (true);

create policy entries_insert_authenticated
on public.entries
for insert
to authenticated
with check (true);

create policy entries_update_authenticated
on public.entries
for update
to authenticated
using (true)
with check (true);

create policy entries_delete_authenticated
on public.entries
for delete
to authenticated
using (true);

drop policy if exists agent_keys_select_own on public.agent_keys;
drop policy if exists agent_keys_insert_own on public.agent_keys;
drop policy if exists agent_keys_update_own on public.agent_keys;
drop policy if exists agent_keys_delete_own on public.agent_keys;

create policy agent_keys_select_own
on public.agent_keys
for select
to authenticated
using (auth.uid() = user_id);

create policy agent_keys_insert_own
on public.agent_keys
for insert
to authenticated
with check (auth.uid() = user_id);

create policy agent_keys_update_own
on public.agent_keys
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy agent_keys_delete_own
on public.agent_keys
for delete
to authenticated
using (auth.uid() = user_id);
