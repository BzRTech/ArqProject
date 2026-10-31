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
- Etapa atual: **editor com blocos concluído** (branch `fase-editor-blocos`, empilhada sobre `fase-1-nucleo` → `fase-0-fundacao`). Próxima: Fase 2 (contas, organizações, projetos no servidor) e depois Fase 3 (bancos). Ordem ajustada: ver nota no início da seção 5 do PLANO.
- Fase 0: monorepo + Docker Compose (postgres 16, redis 7, SeaweedFS S3, backend, frontend); Django 5.2 LTS com custom `User` (login por e-mail), DRF, drf-spectacular, `/api/health/`, `ensure_bucket`; front Vite 8 + React 19 + TS 5.9 strict, ESLint, Vitest, Playwright, `gen:api`.
- Fase 1: núcleo em `frontend/src/core` (units, geometry, drawing/compileView, dimensions com cadeia, sheets), `render/svg` e `render/pdf`; página `/dev/primitivas` (A3 de catálogo). ADR 003.
- Editor com blocos (`/editor`, `frontend/src/features/plan-editor`):
  - Núcleo novo: `core/blocks` (expressões sem eval, símbolos paramétricos em JSON, catálogo com 15 blocos — ADR 004), `core/project` (schema zod v1 do documento, itens, paredes com meia-esquadria, calibração da planta base, `environmentEntities`), `core/editor/snap`, `core/sheets/fit` + `plan-sheet` (A3 com escala automática), `drawing/bounds` e `drawing/transform-entities`.
  - Estado: zustand + immer + zundo (desfazer/refazer; arrasto = 1 passo). Persistência local em IndexedDB (projeto + imagens), autosave.
  - Ferramentas: selecionar/arrastar, parede (snap em extremidade, ortogonal, grade; fecha no 1º ponto), cota (2 pontos + afastamento), texto, inserir bloco (clique ou arrastar do catálogo); item: L×P em cm, rotação, espelhar, duplicar, excluir; ambientes em abas; importar imagem da planta e calibrar; PDF com uma prancha A3 por ambiente.
  - Tela usa a mesma compilação do PDF na escala de exibição 1:50 (penas e textos como no papel).
  - Esquadrias como VÃOS na parede (schema v2 + migração v1→v2): 3 portas e 5 janelas, recorte da parede, deslizar pela parede, inverter lado/dobradiça; "Cotar parede" (cadeia pela face externa com os vãos); comprimento DIGITADO ao desenhar parede; ferramenta "Ambiente" (retângulo pelas medidas internas). Adendo no ADR 004.
  - A escala da prancha é escolhida montando o desenho em cada escala candidata (as cotas dependem dela).
  - Prints em `docs/prints/editor/`.
- Decisões registradas: backend Django/DRF + PostgreSQL (substituiu Supabase); ADR 001 (PDF), 002 (S3 local: SeaweedFS), 003 (convenções do núcleo), 004 (blocos paramétricos como dados).
- Versões fixadas por compatibilidade: TypeScript 5.9 (typescript-eslint e openapi-typescript ainda não suportam TS 6+/7); `@playwright/test` 1.63.0.
- Pendências: material adicional do usuário em `docs/material/`; URL pública do S3 para upload pré-assinado (Fase 2, ADR 002); `DimStyle` do `SheetTemplate` (Fase 6); itens pendentes das Fases 4–5 listados na nota da seção 5 do PLANO.
- Dica de dev: depois de instalar dependências novas no front, reinicie o container `frontend` (o `npm ci` roda só na subida). Em dev, `window.__editor` expõe o store do editor (depuração).
- Lição: substituições de texto em scripts devem falhar se não casarem (um `replace` silencioso deixou o PDF sem as esquadrias; há teste de regressão).
