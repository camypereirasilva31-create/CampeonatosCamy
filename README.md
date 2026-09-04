# TCBrave 2026 — Leaderboard

MVP do leaderboard do campeonato TCBrave 2026. Next.js + TypeScript + Supabase + Tailwind, hospedado gratuitamente na Vercel.

## 1. Criar o projeto no Supabase (grátis)

1. Acesse https://supabase.com e crie um projeto novo (plano Free).
2. No painel, vá em **SQL Editor** → cole todo o conteúdo de `supabase/schema.sql` → **Run**.
   Isso cria as 4 tabelas, as políticas de segurança (RLS) e já insere as 4 categorias.
3. Vá em **Authentication → Users** → **Add user** → crie o usuário do organizador
   (e-mail + senha). Esse é o único login do sistema — não existe cadastro público.
4. Vá em **Project Settings → API** e copie:
   - `Project URL`
   - `anon public` key
   - `service_role` key (secreta — nunca compartilhe)

## 2. Rodar localmente

```bash
npm install
cp .env.local.example .env.local
# preencha .env.local com os 3 valores do passo anterior
npm run dev
```

Acesse `http://localhost:3000` (público) e `http://localhost:3000/admin/login` (organizador).

## 3. Subir para o seu GitHub (repositório `tcbrave-2026`)

Dentro da pasta do projeto:

```bash
git init
git add .
git commit -m "TCBrave 2026 - MVP inicial"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/tcbrave-2026.git
git push -u origin main
```

(Troque `SEU-USUARIO` pelo seu usuário do GitHub. Se o repositório `tcbrave-2026` já
existir com algum conteúdo, use `git pull origin main --allow-unrelated-histories` antes do push.)

## 4. Deploy na Vercel (grátis)

1. Acesse https://vercel.com → **Add New Project** → importe o repositório `tcbrave-2026`.
2. Em **Environment Variables**, adicione as 3 mesmas variáveis do `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Deploy. Pronto — o link público já pode ser divulgado para o evento.

## Fluxo do sistema

- **Organizador** (`/admin`, atrás de login): cadastra duplas → cadastra provas →
  lança resultados → o sistema calcula colocação, pontos e ranking automaticamente.
- **Público** (`/`): escolhe a categoria → vê o leaderboard ao vivo (atualiza sozinho,
  via Supabase Realtime) → pode abrir o detalhamento de qualquer dupla.
- A última prova pode ter os resultados lançados **sem publicar** — o organizador
  revisa em "Provas" e clica em **PUBLICAR RESULTADO FINAL** quando estiver pronto.

## Decisões tomadas onde a especificação era ambígua

Ver a análise completa na conversa, resumo:

1. `UNIQUE (prova_id, dupla_id)` no banco, evitando resultado duplicado.
2. Pontuação da 1ª colocada = total de duplas **cadastradas na categoria** (fixo),
   não apenas as que participaram daquela prova específica.
3. Desempate geral: sequência de colocações (melhor 1º lugar, depois melhor 2º, etc.),
   e por último ordem alfabética do nome da dupla.
4. Publicação (`publicado`) funciona de forma genérica em todas as provas — o mesmo
   mecanismo cobre o caso especial da última prova, sem lógica duplicada.
5. Login do organizador: usuário único criado manualmente no painel do Supabase,
   sem tela de cadastro no app.
