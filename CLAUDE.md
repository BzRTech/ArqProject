# CLAUDE.md — Prancheta

Sistema web para projetos de arquitetura de interiores: planta baixa sobre planta importada, itens com marcadores e legenda, detalhamento paramétrico de marcenaria, bancos de conteúdo (catálogo, MDF, puxadores, modelos, detalhes), pranchas e memorial em PDF.

Plano completo: `docs/PLANO.md`. Referência de fluxo: `docs/referencia/`. Material adicional do usuário: `docs/material/` (ler o `LEIAME.md` de lá).

## Stack
- **Backend:** Python 3.12, Django 5, DRF, drf-spectacular, PostgreSQL 16 (JSONB), django-storages + S3 (SeaweedFS em dev — ADR 002), WeasyPrint, Celery + Redis (só quando necessário), pytest-django, factory_boy, ruff.
- **Frontend:** React + TypeScript (strict) + Vite, Zustand + immer + zundo, TanStack Query, zod, SVG, jsPDF + svg2pdf.js, three.js/@react-three/fiber, Vitest, Playwright.
- **Infra local:** Docker Compose (postgres, s3/SeaweedFS, redis, backend, frontend).

## Regras de arquitetura (não negociáveis)
- **Unidades:** milímetros inteiros em todo lugar (JSON, tabelas, núcleo). cm só na exibição, pt-BR ("45,2").
- **Backend não calcula geometria.** Ele guarda, versiona, valida formato, controla permissão, serve bancos e gera relatórios.
- **Núcleo puro:** `frontend/src/core/**` sem React/DOM/three. Toda geometria, cota, regra de marcenaria e layout de prancha mora aqui.
- **Renderizadores não calculam:** `render/svg`, `render/pdf`, `render/three` só convertem saídas do núcleo.
- **Projeto = documento JSONB** com `schema_version` e `revision`. Save com `If-Match`; conflito → 409. Mudança de schema exige migração em `core/project/migrations` e novo JSON Schema exportado para `backend/apps/projects/schema/`.
- **Bancos (`apps/library`)** herdam `LibraryEntry` (org null = global; org = escritório; `version` incrementa a cada alteração). Projeto usa item de banco via `libraryRef {kind,id,version}` + snapshot.
- **Multi-escritório:** todo queryset filtrado pela organização do usuário. Toda view nova tem teste de acesso entre organizações.
- **Regras de marcenaria** vêm do `RuleProfile` (banco), nunca hardcoded em componente.
- **Custom User** já existe desde a primeira migration; não trocar.
- Tipos da API no front são **gerados** (`npm run gen:api`), não escritos à mão.

## Convenções
- Interface em pt-BR; código e identificadores em inglês.
- Django: lógica em `services.py`/`selectors.py`, views finas; um app por domínio.
- Front: `features/<feature>/`, um componente por arquivo; testes do núcleo ao lado (`*.test.ts`).
- Motor de marcenaria em TDD com casos numéricos exatos.
- Mostrar a migration gerada antes de aplicar; nunca editar migration já commitada.
- Não copiar nome, logo, textos, ícones, cores ou layout do produto de referência.

## Comandos
- `docker compose up` — sobe tudo
- `docker compose exec backend python manage.py migrate | ensure_bucket | seed_library | import_library --kind <k> <arquivo>`
- Sem Docker: `cd backend && uv sync && uv run pytest`
- `docker compose exec backend pytest` · `ruff check .`
- `cd frontend && npm run dev | test | test:e2e | lint | typecheck | gen:api`

## Antes de dizer que terminou
1. ruff + pytest + lint + typecheck + vitest passando;
2. abrir o app via Playwright e tirar screenshot das telas alteradas;
3. se gerou PDF, conferir uma medida em escala;
4. atualizar "Estado atual" abaixo.

## Estado atual
- Fase: **0 concluída** (branch `fase-0-fundacao`). Próxima: Fase 1 — núcleo de geometria.
- Feito na Fase 0:
  - Monorepo + `docker-compose.yml` (postgres 16, redis 7, SeaweedFS S3, backend, frontend com proxy `/api`).
  - Django 5.2 LTS: settings `base/dev/test/prod`, custom `User` (login por e-mail) na 1ª migration, DRF, drf-spectacular (`/api/schema/`, `/api/docs/`), django-storages, `/api/health/`, comando `ensure_bucket`.
  - Front: Vite 8 + React 19 + TS 5.9 strict, ESLint (com regra que proíbe React/three em `src/core`), Prettier, Vitest, Playwright, `gen:api` (openapi-typescript + openapi-fetch).
  - Spikes em `frontend/src/spikes/` (SVG pan/zoom 2 000 linhas, PDF A3 1:50 vetorial com teste que mede a escala, three.js 10 caixas texturizadas). Código descartável: o que servir migra para `core/` e `render/` na Fase 1.
- Decisões registradas: backend Django/DRF + PostgreSQL (substituiu Supabase); `docs/adr/001-pdf.md` (jsPDF + svg2pdf, SVG em mm de papel, TTF embutida); `docs/adr/002-s3-local.md` (SeaweedFS no lugar do MinIO).
- Versões fixadas por compatibilidade: TypeScript 5.9 (typescript-eslint e openapi-typescript ainda não suportam TS 6+/7); `@playwright/test` 1.63.0.
- Pendências: aguardando material adicional do usuário em `docs/material/`; URL pública do S3 para upload pré-assinado (Fase 2, ver ADR 002).
