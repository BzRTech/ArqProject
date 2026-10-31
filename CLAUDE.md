# CLAUDE.md — Prancheta

Sistema web para projetos de arquitetura de interiores: planta baixa sobre planta importada, itens com marcadores e legenda, detalhamento paramétrico de marcenaria, bancos de conteúdo (catálogo, MDF, puxadores, modelos, detalhes), pranchas e memorial em PDF.

Plano completo: `docs/PLANO.md`. Referência de fluxo: `docs/referencia/`. Material adicional do usuário: `docs/material/` (ler o `LEIAME.md` de lá).

## Stack
- **Backend:** Python 3.12, Django 5, DRF, drf-spectacular, PostgreSQL 16 (JSONB), django-storages + S3/MinIO, WeasyPrint, Celery + Redis (só quando necessário), pytest-django, factory_boy, ruff.
- **Frontend:** React + TypeScript (strict) + Vite, Zustand + immer + zundo, TanStack Query, zod, SVG, jsPDF + svg2pdf.js, three.js/@react-three/fiber, Vitest, Playwright.
- **Infra local:** Docker Compose (postgres, minio, redis, backend, frontend).

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
- `docker compose exec backend python manage.py migrate | seed_library | import_library --kind <k> <arquivo>`
- `docker compose exec backend pytest` · `ruff check .`
- `cd frontend && npm run dev | test | test:e2e | lint | typecheck | gen:api`

## Antes de dizer que terminou
1. ruff + pytest + lint + typecheck + vitest passando;
2. abrir o app via Playwright e tirar screenshot das telas alteradas;
3. se gerou PDF, conferir uma medida em escala;
4. atualizar "Estado atual" abaixo.

## Estado atual
- Fase: 0 (não iniciada)
- Decisões registradas: backend Django/DRF + PostgreSQL (substituiu Supabase)
- Pendências: aguardando material adicional do usuário em `docs/material/`
