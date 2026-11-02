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
- Etapa atual: **editor com blocos concluído e na `main`** (PR #4). A branch `fase-editor-blocos` recomeça da `main` a cada rodada de ajustes. Próxima: Fase 2 (contas, organizações, projetos no servidor) e depois Fase 3 (bancos). Ordem ajustada: ver nota no início da seção 5 do PLANO.
- Fase 0: monorepo + Docker Compose (postgres 16, redis 7, SeaweedFS S3, backend, frontend); Django 5.2 LTS com custom `User` (login por e-mail), DRF, drf-spectacular, `/api/health/`, `ensure_bucket`; front Vite 8 + React 19 + TS 5.9 strict, ESLint, Vitest, Playwright, `gen:api`.
- Fase 1: núcleo em `frontend/src/core` (units, geometry, drawing/compileView, dimensions com cadeia, sheets), `render/svg` e `render/pdf`; página `/dev/primitivas` (A3 de catálogo). ADR 003.
- Editor com blocos (`/editor`, `frontend/src/features/plan-editor`):
  - Núcleo novo: `core/blocks` (expressões sem eval, símbolos paramétricos em JSON, catálogo com 15 blocos — ADR 004), `core/project` (schema zod v1 do documento, itens, paredes com meia-esquadria, calibração da planta base, `environmentEntities`), `core/editor/snap`, `core/sheets/fit` + `plan-sheet` (A3 com escala automática), `drawing/bounds` e `drawing/transform-entities`.
  - Estado: zustand + immer + zundo (desfazer/refazer; arrasto = 1 passo). Persistência local em IndexedDB (projeto + imagens), autosave.
  - Ferramentas: selecionar/arrastar, parede (snap em extremidade, ortogonal, grade; fecha no 1º ponto), cota (2 pontos + afastamento), texto, inserir bloco (clique ou arrastar do catálogo); item: L×P em cm, rotação, espelhar, duplicar, excluir; ambientes em abas; importar imagem da planta e calibrar; PDF com uma prancha A3 por ambiente.
  - Tela usa a mesma compilação do PDF na escala de exibição 1:50 (penas e textos como no papel).
  - Esquadrias como VÃOS na parede (schema v2 + migração v1→v2): 3 portas e 5 janelas, recorte da parede, deslizar pela parede, inverter lado/dobradiça; "Cotar parede" (cadeia pela face externa com os vãos); comprimento DIGITADO ao desenhar parede; ferramenta "Ambiente" (retângulo pelas medidas internas). Adendo no ADR 004.
  - A escala da prancha é escolhida montando o desenho em cada escala candidata (as cotas dependem dela).
  - Legenda e orçamento (schema v3 + migração v2→v3): `core/project/markers.ts` (numeração por grupo de itens iguais; marcenaria M01…; balão arrastável via `markerOffset`), legenda na prancha (`plan-sheet` reserva coluna), dinheiro em CENTAVOS inteiros (`formatBRL`/`parseBRL`), totais do ambiente/projeto, aprovados, planilha CSV pt-BR; áreas (`core/project/areas.ts`, ferramenta Q, "Criar área do ambiente", rótulo arrastável).
  - Unidades de entrada/exibição por preferência do usuário (`units-pref.ts`, localStorage): paredes m|cm, móveis/esquadrias cm|mm; `formatLength`/`parseLength` (sufixo digitado tem prioridade). Espessura sempre em cm; cotas da prancha em cm.
  - Autosave: grava no máx. 400 ms após a 1ª mudança (edições seguidas não adiam) e, ao sair da página, cópia síncrona em localStorage (`prancheta.backup`); ao abrir vale a mais recente.
  - Paredes como UMA figura: `core/project/wall-union.ts` (união de todas as paredes − vãos, via `polygon-clipping`); paredes sobrepostas se fundem e um vão corta as duas.
  - Edição de parede (`core/project/wall-edit.ts`): mover canto, empurrar trecho, comprimento por trecho, criar/remover canto; versões *Linked* levam trechos/cantos coincidentes de outras paredes; `reattachOpenings` reencaixa esquadrias. Store: `editWall`/`editWalls`. Canvas: alças (quadrado = canto, círculo = meio do trecho), duplo clique cria/remove canto.
  - Piso (schema v4 + migração v3→v4): `Area.floor` (revestimento copiado do catálogo `core/finishes/catalog.ts`); paginação em `core/finishes/layout.ts` (grade/amarração 1/2 e 1/3, ângulo, início centro/canto, juntas recortadas via `clipSegment`); quantidades em `quantities.ts` (m² com perda arredondado p/ cima; rodapé = perímetro − portas na borda); `finishes/budget.ts` (linhas P1… de piso e rodapé no orçamento/legenda/CSV). Preferência "Humanizado" (cor dos pisos, tela e PDF).
  - Interação estilo CAD: cursor em cruz (`CadCursor`, preferência `cadCursor`), snap de PONTO MÉDIO (`SnapOptions.midpoints`, triângulo), cantos de qualquer parede arrastáveis direto (grip; arrasto pelo deslocamento com snap congelado no início), esquadrias grudam no centro do trecho (`segmentCenterOffset`) com guias (`openingGuides`: marca de centro + cotas livres até as faces, `openingClearances`).
  - Seleção múltipla: `selected: SelRef[]` no store (`selection` = o único selecionado ou null; `setSel` mantém os dois em sincronia), `selectMany`/`toggleSelect`; mover/excluir agem no grupo (um passo de desfazer). Área de seleção arrastando no vazio: esq.→dir. = janela (inteiro dentro, `shapeInRect` em `core/geometry/bbox.ts`), dir.→esq. = cruzamento (tocou, pegou); Shift soma/alterna, Ctrl+A tudo, Espaço+arrastar move a vista. Painel `MultiSelectionProps` (contagem por tipo, "Manter só", excluir).
  - Medidas ao editar parede: `wallEditGuides` (feature `geometry.ts`) desenha cotas provisórias dos trechos que mudam ao arrastar canto/empurrar trecho; rodapé mostra o deslocamento (Δ).
  - **Design system v1.0** (`docs/design-system/`, exportado do Claude Design):
    - tokens em `frontend/src/app/tokens.css`; fontes self-hosted via `@fontsource` (Instrument Serif nos títulos, Montserrat na interface, Geist Mono nas medidas); ícones `lucide-react` (traço 1,5);
    - argila (`--clay`) só para seleção e foco; sálvia para cruzamento e alinhado; grafite para a ação principal;
    - cores da interface SOBRE o desenho em `features/plan-editor/theme.ts` (atributos SVG não aceitam `var()`); o desenho técnico e o PDF não mudam;
    - layout do editor: Importar planta e Baixar PDF na barra superior (portal `app/topbar-slot.ts`); barra de ferramentas flutuante no rodapé do palco (só ícones; a ativa mostra o rótulo); opções da vista flutuando no topo; rodapé com atalhos (`kbd`) e zoom (100% = 1:50 em tamanho real); "Enquadrar" evita as faixas flutuantes (`FLOAT_TOP`/`FLOAT_BOTTOM`);
    - controles em `app/ui/` (`Switch`, `Segmented`); avisos em toast; balão do item selecionado em argila (só na tela);
    - prints em `docs/prints/design-system/`.
  - Comprimento digitado num trecho (`setSegmentLengthLinked`) muda SÓ o cômodo dele: tenta empurrar o trecho seguinte; se isso mexe em outra parede (compartilhada), empurra o anterior; só com os dois lados compartilhados o vizinho vai junto. Mover parede compartilhada junto = arrastar o círculo (`pushSegmentLinked`).
  - Cotas LIGADAS (schema v6 + migração v5→v6): `ref` opcional em `dimension`/`chain` — `wall-outer` (cadeia da face externa com vãos, por trecho), `wall-inner` (área útil, de face a face, por trecho) e `item` (folga de um lado do móvel até a parede, raio a partir do meio do lado). `core/project/linked-dims.ts`: `createWallDims` (4 externas + internas sem repetir lados opostos iguais), `createItemDims`, `syncLinkedDims` (devolve o MESMO array se nada mudou; remove a cota se o que ela mede sumiu). O store envolve o `set` do immer e sincroniza em TODA mudança, no mesmo passo de desfazer. Botões: "Cotar parede", "Cotar posição" (item), "Cotar todos os móveis" (painel do ambiente). Afastamento escolhido pelo usuário é mantido.
  - Tapetes por baixo: `BlockDef.underlay`; `itemsInDrawOrder` (tela, PDF e clique). Blocos "Tapete" e "Tapete redondo" (Estar).
  - Auxiliar de ângulo reto (`core/editor/right-angle.ts`): ao arrastar um canto, gruda nas restrições "congeladas" no início do arrasto — círculo de Tales (90° no próprio canto), retas perpendiculares nos vizinhos (90° neles) e horizontais/verticais pelos vizinhos; encontros de duas restrições têm prioridade (`SnapKind` `right`). Marcas (`cornerAngleMarks`): símbolo de ângulo reto em sálvia nos cantos a 90° (tolerância 0,1°) e graus nos demais; com a parede selecionada, mostra os graus dos cantos fora do esquadro.
  - Pilares (schema v5 + migração v4→v5): `Column` em `drawings` (`kind: 'column'`, centro, retangular/circular, largura × profundidade, rotação); `core/project/columns.ts` (contorno, desenho CHEIO preto = seção de estrutura cortada, por cima das paredes; acerto). Ferramenta Pilar (L): num canto de parede entra centrado no canto; perto de uma parede, centrado no eixo e girado como o trecho (`columnPlacement`). Snap nos cantos, centro e meio dos lados; R gira 90°. Ainda não desconta da área/piso.
  - DWG: via LibreDWG (`dwg2dxf`) como programa SEPARADO no servidor (GPL-3.0 — não linkar no app nem empacotar no front); depois da Fase 2, junto da importação de DXF.
  - Prints em `docs/prints/editor/`.
- Decisões registradas: backend Django/DRF + PostgreSQL (substituiu Supabase); ADR 001 (PDF), 002 (S3 local: SeaweedFS), 003 (convenções do núcleo), 004 (blocos paramétricos como dados).
- Versões fixadas por compatibilidade: TypeScript 5.9 (typescript-eslint e openapi-typescript ainda não suportam TS 6+/7); `@playwright/test` 1.63.0.
- Testar sem Docker: `cd frontend && npm ci && npm run dev` (usar `npm ci` para não alterar o lockfile) → `/editor` (Node ≥ 22.12; ver README).
- Pendências: material adicional do usuário em `docs/material/`; URL pública do S3 para upload pré-assinado (Fase 2, ADR 002); `DimStyle` do `SheetTemplate` (Fase 6); itens pendentes das Fases 4–5 listados na nota da seção 5 do PLANO.
- Dica de dev: depois de instalar dependências novas no front, reinicie o container `frontend` (o `npm ci` roda só na subida). Em dev, `window.__editor` expõe o store do editor (depuração).
- Lição: o `polygon-clipping` lança "Unable to complete output ring" com pontos quase iguais (ponto flutuante). `wallsShape` arredonda para 0,01 mm antes da união (resolve 100% num fuzz de 4000 plantas), tenta grades mais grossas e, em último caso, desenha as paredes separadas — nunca lança. Teste em `wall-union.robust.test.ts` + e2e. Todas as rotas têm `ErrorBoundary` (`app/ErrorPage.tsx`: recarregar + baixar o projeto em .json).
- Lição: em `setView((v) => …)` NUNCA ler um valor mutável dentro do atualizador (o arrasto da vista lia `d.last` depois de trocado e o deslocamento dava zero). Botão do meio = mover a vista (como no LibreCAD): o canvas cancela `mousedown`/`auxclick` do botão do meio (rolagem automática do Chrome/Edge no Windows, colar no Linux); cursor de mão fechada (`canvas--panning`). Há e2e.
- Lição: o palco do editor tem `user-select: none` (e o pointerdown limpa a seleção de texto); sem isso, arrastar canto/área pinta as cotas de azul como texto de página. Há teste e2e (arrasto em diagonal sobre as cotas).
- Lição: substituições de texto em scripts devem falhar se não casarem (um `replace` silencioso deixou o PDF sem as esquadrias; há teste de regressão).
