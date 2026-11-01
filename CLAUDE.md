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
- Fase: **1 concluída** (branch `fase-1-nucleo`, empilhada sobre `fase-0-fundacao`). Próxima: Fase 2 — contas, organizações e projetos.
- Fase 0: monorepo + Docker Compose (postgres 16, redis 7, SeaweedFS S3, backend, frontend); Django 5.2 LTS com custom `User` (login por e-mail), DRF, drf-spectacular, `/api/health/`, `ensure_bucket`; front Vite 8 + React 19 + TS 5.9 strict, ESLint, Vitest, Playwright, `gen:api`.
- Fase 1 (núcleo em `frontend/src/core`, convenções em `core/README.md` e ADR 003):
  - `units` (mm inteiros, `formatCm` "45,2"/"318", `parseCm`, m, m²), `geometry` (vec, transform, bbox, polygon com área/centroide/hachura recortada, viewport de pan/zoom).
  - `drawing`: `Entity` (modelo) → `compileView({scale, origin})` → `Primitive` (mm de papel); penas e tipos de linha; métricas aproximadas da Roboto.
  - `dimensions`: cota simples (horizontal/vertical/alinhada) e cota em cadeia com total; texto legível (NBR 10126), texto que não cabe vai para fora ou é escalonado; soma dos vãos = total.
  - `sheets`: formatos A4–A1, margens NBR 10068, escala gráfica.
  - `render/svg` (árvore `SvgNode` → markup ou React) e `render/pdf` (svg2pdf, várias páginas).
  - Página `/dev/primitivas`: prancha A3 com planta 1:50, vista 1:20 e corte 1:10 do rack M01, legenda; na tela (pan/zoom, "tamanho real") e em PDF. Os testes medem 3 linhas dentro do PDF (Vitest e e2e).
  - Spikes de SVG e PDF removidos (migrados); spike 3D mantido até a Fase 9. Prints em `docs/prints/fase-1/`.
- Decisões registradas: backend Django/DRF + PostgreSQL (substituiu Supabase); ADR 001 (PDF), ADR 002 (S3 local: SeaweedFS), ADR 003 (convenções do núcleo).
- Versões fixadas por compatibilidade: TypeScript 5.9 (typescript-eslint e openapi-typescript ainda não suportam TS 6+/7); `@playwright/test` 1.63.0.
- Pendências: aguardando material adicional do usuário em `docs/material/`; URL pública do S3 para upload pré-assinado (Fase 2, ver ADR 002); `DimStyle` virá do `SheetTemplate` (Fase 6).
