-- =========================================================
-- TCBrave 2026 — schema do banco (Supabase / Postgres)
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase.
-- =========================================================

-- Tipos de prova possíveis
create type tipo_prova as enum ('PESO', 'REPETICOES', 'FOR_TIME', 'FOR_TIME_CAP');

-- ---------------------------------------------------------
-- categorias
-- ---------------------------------------------------------
create table categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique
);

insert into categorias (nome) values
  ('RX Masculina'),
  ('RX Mista'),
  ('Scaled Feminina'),
  ('Scaled Masculina');

-- ---------------------------------------------------------
-- duplas
-- ---------------------------------------------------------
create table duplas (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references categorias(id) on delete restrict,
  nome_dupla text not null,
  atleta_1 text not null,
  atleta_2 text not null,
  created_at timestamptz not null default now()
);

create index idx_duplas_categoria on duplas(categoria_id);

-- ---------------------------------------------------------
-- provas
-- ---------------------------------------------------------
create table provas (
  id uuid primary key default gen_random_uuid(),
  numero int not null unique,
  nome text,
  tipo tipo_prova not null,
  time_cap_seconds int,
  publicado boolean not null default false,
  created_at timestamptz not null default now(),
  constraint cap_apenas_for_time_cap check (
    (tipo = 'FOR_TIME_CAP' and time_cap_seconds is not null)
    or (tipo <> 'FOR_TIME_CAP' and time_cap_seconds is null)
  )
);

-- ---------------------------------------------------------
-- resultados
-- ---------------------------------------------------------
create table resultados (
  id uuid primary key default gen_random_uuid(),
  prova_id uuid not null references provas(id) on delete cascade,
  dupla_id uuid not null references duplas(id) on delete cascade,
  peso_lb numeric,
  repeticoes int,
  tempo_seconds int,
  tomou_cap boolean not null default false,
  repeticoes_faltantes int,
  colocacao int,
  pontos int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (prova_id, dupla_id),
  constraint cap_fields_coherentes check (
    (tomou_cap = true and repeticoes_faltantes is not null and tempo_seconds is null)
    or (tomou_cap = false and repeticoes_faltantes is null)
  )
);

create index idx_resultados_prova on resultados(prova_id);
create index idx_resultados_dupla on resultados(dupla_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_resultados_updated_at
before update on resultados
for each row execute function set_updated_at();

-- ---------------------------------------------------------
-- RLS — leitura pública restrita a dados publicados,
-- escrita apenas via service role (usada nas Server Actions
-- do app, depois de validar a sessão do organizador).
-- ---------------------------------------------------------
alter table categorias enable row level security;
alter table duplas enable row level security;
alter table provas enable row level security;
alter table resultados enable row level security;

create policy "categorias: leitura publica"
  on categorias for select
  using (true);

create policy "duplas: leitura publica"
  on duplas for select
  using (true);

create policy "provas: leitura publica so das publicadas"
  on provas for select
  using (publicado = true);

create policy "resultados: leitura publica so de provas publicadas"
  on resultados for select
  using (
    exists (
      select 1 from provas
      where provas.id = resultados.prova_id
      and provas.publicado = true
    )
  );

-- O painel do organizador lê os dados com a sessão do próprio usuário
-- logado (sujeita a RLS, não usa a service role para leitura) — por isso
-- precisa enxergar TAMBÉM provas/resultados ainda não publicados.
-- Políticas permissivas no Postgres se combinam com OR, então isto soma
-- à policy pública acima em vez de substituí-la.
create policy "provas: leitura total do organizador logado"
  on provas for select
  to authenticated
  using (true);

create policy "resultados: leitura total do organizador logado"
  on resultados for select
  to authenticated
  using (true);

-- Nenhuma policy de INSERT/UPDATE/DELETE é criada para as roles
-- anon/authenticated: toda escrita passa pelas Server Actions do
-- Next.js, que usam a service role key (bypassa RLS) só depois de
-- confirmar a sessão do organizador logado.

-- ---------------------------------------------------------
-- Habilitar Realtime nas tabelas que o leaderboard público escuta
-- ---------------------------------------------------------
alter publication supabase_realtime add table resultados;
alter publication supabase_realtime add table provas;
