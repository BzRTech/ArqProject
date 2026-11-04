# Plano — Sistema web de planta baixa, detalhamento e pranchas em PDF

> Codinome provisório: **Prancheta**. Troque à vontade.
> Referência funcional: vídeo de demonstração do "manual técnico" do Club ArqExpress (screenshots em `docs/referencia/`).
> **Regra:** inspirar-se no *fluxo e nas funcionalidades*, nunca copiar nome, logo, textos, paleta ou identidade visual do produto de referência.

---

## 1. Análise do vídeo

O vídeo (≈2 min) mostra um projeto de **quarto/suíte** sendo trabalhado em um editor web. São, na prática, **três sistemas integrados**:

### 1.1 Editor de planta (prancha de projeto) — `01`, `09`, `10`

| Área | O que faz |
|---|---|
| **Barra superior** | Planta · 3D · Vistas · Exportar · **Escala** (calibrada) · **Conferir medida** · Minha marca · Prancha · Tutorial · idioma |
| **Ferramentas** | + Adicionar (itens de catálogo) · travar · desfazer/refazer · Selecionar · **Cota** · Linear · **Parede** · Área · Retângulo · Guia · Texto · **Marcador** (balão numerado) · Folha A4 ± · Exibir |
| **Ambientes do projeto** | Vários ambientes no mesmo cliente (cozinha, sala, suíte…), cada um com sua planta e suas pranchas |
| **Categorias / disciplinas** | Compat. · Layout · Revestimentos · Elétrica · Marcenaria · + categoria/vista. Cada uma é uma *página da mesma planta* exibindo só os itens daquela disciplina, com contador de itens |
| **Pranchas** | Prancha 1, 2… por categoria + pranchas de detalhe geradas automaticamente ("Detalhe M01 – 1 Planta / 2 Vistas / 3 Perspectivas"). Botão "Todas" |
| **Planta base** | Planta importada (imagem/PDF), **travada**, **ativa**, opção "ver através (sobrepor)" |
| **Modo humanizada** | Liga/desliga preenchimentos com textura (piso de madeira, tapete, cama, etc.) |
| **Legenda automática** | Lista numerada (marcador → nome → quantidade/unidade) no canto da prancha |
| **Carimbo** | Título da prancha ("LAYOUT · PRANCHA 1"), escala gráfica, nota "as medidas devem ser conferidas no local", logo do escritório |
| **Painel "Itens do projeto"** | Por item: tipo (catálogo), quantidade + unidade, medidas L×P(×A), padrões, espelhar, status (**existente**, sem marcador, quantitativo na legenda), observação/especificação, **preço unitário / total**, marca/modelo, fornecedor, **aprovado** ✓. Rodapé: total linear (m), nº de marcadores, aprovados x/y |
| **Barra do item selecionado** | Nome, L, P, rotação (90°/45°), opacidade, tamanho do texto, **Detalhar marcenaria**, duplicar. Para desenhos: cor, tipo de linha (contínuo…), espessura, preenchimento, copiar desenho |
| **Saídas** | **Memorial (PDF)** e **Salvar projeto** |

### 1.2 Detalhamento de marcenaria (módulo paramétrico) — `02` a `07`

Wizard em 6 passos aberto a partir de um item da planta (ex.: "Rack / painel de TV", código **M01**):

1. **Modelo** — catálogo de modelos prontos *já nas medidas do item* (suspenso com palhinha, ripado 5 portas, gavetas + nicho, basculantes + nichos, portas lisas com cava 45°…) ou "papel em branco".
2. **Planta + vista interna** — o coração paramétrico:
   - Medidas totais L × P × A; base (direto no piso / suspenso X cm / rodapé); pé-direito do ambiente (270 cm).
   - **Módulos** M1…Mn com largura eixo-a-eixo e vão livre; juntar com o vizinho, dividir em 2, "os outros iguais", **arredondar para cm inteiro**.
   - **Frente** por módulo: aberto, 1 porta, 2 portas, gavetas, basculante, de correr.
   - **Por dentro**: prateleiras, gaveta interna, cesto aramado (±).
   - **Cantos**: reto, R6, R10, R15, R20, canto inteiro; nicho aberto ou peça curva fixa.
   - Espessuras: laterais/base/divisórias/prateleiras 18 mm, fundo 6 mm recuado 1 cm.
   - **Emendas** marcadas automaticamente quando a peça passa do tamanho da chapa.
   - **Cotas automáticas** em cadeia (total, interna, por vão) na vista frontal e na planta, com arcos de abertura das portas.
   - **Avisos de conferência técnica**: "módulo M4 com menos de 10 cm de vão — não dá para montar", "portas com larguras diferentes → igualar portas".
3. **Vista interna** — prateleiras, nichos, divisões e alturas; "montar peças" (tomada, interruptor, LED…).
4. **Vista externa — portas e puxadores** — espessura da porta (18 mm), folga (3 mm), quanto a frente passa/encolhe em cima/embaixo/laterais, canto superior 45°; **puxadores** (barra slim, perfil alumínio, perfil no topo, cava embutida, alça, botão, fecho toque, escavado, cava arredondada, cava superior, gola) com posição e altura; **detalhe ampliado do puxador** em balão; portas **ripadas** (ripas 2×2 cm, espaço 1 cm).
5. **Acabamento** — 3D portas fechadas e 3D aberto; aplicar cor em portas/frentes, laterais, corpo interno, tamponamento ou tudo; **sentido do veio** vertical/horizontal; paleta de MDF lisos e madeirados; texto do acabamento; observações (uma por linha → saem na prancha).
6. **Prancha** — código, peça/ambiente, lista de peças (opcional), escala (automática = maior que couber, ou fixa 1:15/1:20), **distribuição das vistas** (automático, juntas, lado a lado, uma embaixo da outra, uma por prancha), anotações (seta vermelha, círculo pontilhado), **especificações geradas automaticamente** (editáveis, com "voltar ao automático").

Saídas: **Baixar prancha (PDF)**, Salvar e fechar. Ao salvar, as pranchas de detalhe do item são criadas/atualizadas no projeto; o item na planta passa a ser "editar detalhamento 3D / atualizar pranchas / excluir detalhamento".

### 1.3 Pranchas e PDF

- Folha (A4 no vídeo; prever A3/A2/A1) com margem, moldura e carimbo.
- Viewports da planta filtrados por disciplina + legenda.
- Pranchas de detalhe compostas por vistas em escala + bloco de especificações numeradas.
- PDF **vetorial** (linhas e texto nítidos para impressão/obra), não print de tela.

### 1.4 Observações de produto

- O diferencial não é o "CAD" em si, é o **conhecimento de marcenaria embutido** (regras, avisos, especificação automática) e a **geração automática de pranchas**. O plano prioriza isso.
- O editor de planta é mais simples do que parece: a planta base é importada e calibrada; o usuário desenha por cima (paredes, cotas, itens). Não é preciso construir um CAD completo.
- A geometria precisa morar em **um núcleo puro (TypeScript sem React)**, testável, que gera primitivas de desenho consumidas por tela, PDF e 3D. Esse é o ponto que mais determina o sucesso do projeto.

---

## 2. Escopo

### MVP (o que entrega valor sozinho)
1. Projeto → ambientes → planta base importada e calibrada em escala.
2. Desenho por cima: parede, retângulo, cota, texto, marcador.
3. Itens de catálogo com marcador numerado, painel de itens e legenda automática.
4. Disciplinas (Layout, Marcenaria, Elétrica, Revestimentos) como filtros da mesma planta.
5. Pranchas A4/A3 com carimbo e escala → **PDF vetorial**.
6. Detalhamento de marcenaria paramétrico para **móveis retos** (módulos, frentes, internos, portas, 2–3 puxadores) → vistas cotadas + especificações → prancha PDF.
7. Memorial em PDF (itens, quantidades, especificações, preços).
8. **Bancos de conteúdo** no PostgreSQL (catálogo de itens, MDF/acabamentos, puxadores, ferragens, modelos de marcenaria, regras, banco de detalhes, modelos de folha), globais e por escritório.
9. Contas, escritórios (organizações) e versões do projeto.

### Pós-MVP
3D com acabamentos · cantos arredondados · ripado · catálogo de modelos prontos · "Minha marca" (logo/cores no carimbo) · multiusuário/compartilhamento · aprovação pelo cliente · plano de corte/lista de peças para marceneiro · DXF.

### Fora de escopo
Modelagem 3D livre da casa, render fotorrealista, BIM/IFC.

---

## 3. Stack

| Camada | Escolha | Por quê |
|---|---|---|
| **Backend** | **Python 3.12 + Django 5 + Django REST Framework** | Familiaridade; o Django Admin serve de painel pronto para cuidar dos bancos |
| Banco de dados | **PostgreSQL 16** (JSONB) | Projeto como documento JSONB + tabelas relacionais para os bancos e para os relatórios |
| API / contrato | **drf-spectacular** (OpenAPI) → **openapi-typescript** no front | Tipos do front gerados a partir da API, sem duplicar à mão |
| Auth | Sessão do Django + CSRF (SPA servida no mesmo domínio) | Mais simples e seguro para um app só web. Trocar por `djangorestframework-simplejwt` se surgir app mobile |
| Arquivos | **django-storages + S3** (SeaweedFS em dev — ver ADR 002) | Plantas base, logos, texturas, miniaturas |
| PDF do memorial | **WeasyPrint** (template Django → PDF) | Documento tabular, combina com o servidor |
| PDF das pranchas | **jsPDF + svg2pdf.js** no cliente | Usa o mesmo núcleo de geometria da tela (que é TypeScript) |
| Tarefas assíncronas | **Celery + Redis** (só quando precisar) | Miniaturas, import de catálogos grandes, PDF pesado |
| Front | **React + TypeScript + Vite** | |
| Estado | **Zustand + immer**, undo/redo com **zundo**; **TanStack Query** para a API | |
| Validação | **zod** no front → exporta **JSON Schema** → validado no Django com `jsonschema` | Uma única fonte de verdade para o formato do projeto |
| Desenho | **SVG** com pan/zoom próprio | Mesmo modelo de primitivas que vai para o PDF |
| 3D | **three.js** via **@react-three/fiber** + drei | |
| Testes | **pytest-django + factory_boy** (back), **Vitest** (núcleo), **Playwright** (e2e) | |
| Qualidade | **ruff** (Python), ESLint + Prettier (TS) | |
| Infra local | **Docker Compose**: postgres, s3 (SeaweedFS), redis, backend, frontend | |

**Unidades:** todo o modelo em **milímetros inteiros**, tanto no JSON quanto nas tabelas. Exibição em cm com 1 casa decimal ("45,2"). Nenhum float em cm é persistido.

**Divisão de responsabilidades:** o backend **não calcula geometria**. Ele guarda, versiona, valida o formato, controla permissões, serve os bancos e gera relatórios (memorial). Toda a geometria (cotas, marcenaria, vistas, pranchas) fica no núcleo TypeScript do front.

---

## 4. Arquitetura

### 4.1 Repositório (monorepo)

```
prancheta/
  docker-compose.yml
  backend/
    manage.py
    config/settings/{base,dev,prod}.py
    apps/
      accounts/      User (login por e-mail), Organization (escritório), Membership
      projects/      Project, ProjectVersion, ProjectItemIndex, serviços de save/validação
      library/       os BANCOS (seção 4.3) + admin + importadores
      assets/        upload com URL pré-assinada, miniaturas
      exports/       memorial PDF (WeasyPrint), futuros relatórios
    library_seed/    JSON/CSV versionados com o conteúdo inicial dos bancos
    tests/
  frontend/
    src/
      core/          ← TS puro (geometria, cotas, marcenaria, pranchas). 100% testado.
      render/        svg/, pdf/, three/
      features/      plan-editor/, items/, joinery-wizard/, sheets/, library/, projects/
      api/           cliente gerado do OpenAPI + hooks TanStack Query
      app/
  docs/
    PLANO.md
    referencia/      screenshots do vídeo
    material/        ← o que você enviar depois (seção 6)
    adr/
```

### 4.2 Projeto (documento) — `apps/projects`

O projeto é editado como **um documento** (muitas entidades pequenas, undo/redo, edição offline curta). Salvá-lo como JSONB evita centenas de tabelas e PATCHs a cada arrasto de mouse.

```python
class Project(models.Model):
    org            = FK(Organization)
    name, client_name, status   # rascunho / em aprovação / aprovado / arquivado
    schema_version = PositiveIntegerField()
    data           = JSONField()            # documento completo (validado por JSON Schema)
    revision       = PositiveIntegerField() # controle de concorrência otimista
    thumbnail      = FK(Asset, null=True)
    created_by, created_at, updated_at

class ProjectVersion(models.Model):        # histórico / restaurar
    project, revision, data, label, created_by, created_at

class ProjectItemIndex(models.Model):      # derivado a cada save — para memorial, busca e relatórios
    project, environment_id, environment_name, discipline, marker_no,
    name, library_item (FK null), qty, unit, size_w_mm, size_d_mm, size_h_mm,
    unit_price, supplier, brand_model, status, approved, joinery_code
```

- **Save:** `PUT /api/projects/{id}/` com `If-Match: <revision>` → 409 se outra aba/pessoa salvou antes. Autosave com debounce no front.
- **Validação:** `jsonschema` contra `project.schema.json` (gerado a partir do zod) + migração automática de `schema_version` antiga ao abrir.
- **Índice derivado:** `services.rebuild_item_index(project)` na mesma transação do save.

Formato do documento (zod no front):

```ts
Project { schemaVersion, environments: Environment[], librarySnapshots: Record<string, LibrarySnapshot> }
Environment { id, name, ceilingHeightMm, basePlans: BasePlan[], drawings: DrawingEntity[],
              items: Item[], disciplines: string[], sheets: Sheet[], joinery: Joinery[] }
BasePlan { id, assetId, calibration: { p1, p2, realDistanceMm }, locked, visible, opacity }
Item { id, libraryRef?: { kind, id, version }, name, markerNo, discipline, position, rotationDeg,
       mirrored, sizeMm: {w,d,h?}, qty, unit, status, approved, unitPrice?, brandModel?,
       supplier?, notes?, joineryId? }
Joinery { id, code: 'M01', name, presetRef?, furniture: Furniture, finish: Finish,
          rulesRef: { id, version }, sheetOptions, specsOverride? }
Sheet { id, discipline?, joineryId?, kind, paper, orientation, scale: 'auto'|number, title,
        viewports: Viewport[], templateRef? }
```

### 4.3 Os bancos (bibliotecas de conteúdo) — `apps/library`

Todos os bancos seguem o mesmo padrão:

```python
class LibraryEntry(models.Model):   # abstrato
    org        = FK(Organization, null=True)  # null = banco GLOBAL do sistema; preenchido = banco do ESCRITÓRIO
    slug, name, description, tags (ArrayField), is_active
    version    = PositiveIntegerField()        # incrementa a cada alteração
    thumbnail  = FK(Asset, null=True)
    created_by, created_at, updated_at
```

| Banco | Model | Conteúdo principal |
|---|---|---|
| Disciplinas | `Discipline` | Layout, Elétrica, Revestimentos, Marcenaria, Compat.; cor, ordem, ícone |
| **Catálogo de itens** | `CatalogItem` (+ `ItemCategory`) | Cama, criado, rack, armário, louças, tomadas…; disciplina, unidade, medidas padrão (mm), **símbolo em planta** (primitivas paramétricas JSON), estilo humanizado, `joinery_type` se for detalhável, preço de referência |
| **Acabamentos / MDF** | `Material` | Tipo (liso, madeirado, laminado, pintura…), fabricante, linha, cor hex, **textura** (Asset), veio permitido, espessuras disponíveis, tamanho de chapa |
| **Puxadores** | `Handle` | Tipo (cava, perfil, botão, fecho toque…), parâmetros do perfil, **desenho do detalhe ampliado** (primitivas), fabricante/código |
| Ferragens | `Hardware` | Dobradiças, corrediças, cestos, articuladores; regras de quantidade |
| Tipos de móvel | `JoineryType` | Rack, armário, bancada, painel, closet…; parâmetros padrão |
| **Modelos prontos de marcenaria** | `JoineryPreset` | Por tipo; parâmetros **relativos** ao tamanho (ex.: "4 módulos iguais, 2 portas cada, cava 45°") que o núcleo resolve para o L×P×A do item |
| **Regras de marcenaria** | `RuleProfile` | Espessuras, folgas, chapa, limites de vão, dobradiças por altura; perfil global padrão + perfil do escritório |
| **Banco de detalhes** | `DetailBlock` | Detalhes técnicos reutilizáveis (encontro de tampo, rodapé recuado, cava, emenda, iluminação em LED…) como primitivas paramétricas + texto padrão; inseríveis em qualquer prancha |
| Modelos de folha/carimbo | `SheetTemplate` | Tamanho de folha, margens, carimbo, posição do logo, notas padrão ("medidas devem ser conferidas no local") |
| Textos padrão | `SpecTemplate` | Frases de especificação e observações recorrentes |

**Regras dos bancos:**
1. **Global + escritório:** a API devolve global ∪ do escritório; o escritório pode **sobrescrever** um item global (mesmo `slug`) ou criar os seus.
2. **Snapshot no projeto:** ao usar um item do banco, o projeto guarda `libraryRef {kind, id, version}` + um snapshot dos campos usados em `librarySnapshots`. Alterar o banco **não muda projetos antigos sem aviso**; o editor mostra "há versão nova no banco — atualizar?".
3. **Carregamento:** `GET /api/library/bundle/` devolve tudo o que o editor precisa em uma chamada, com `ETag`; o front guarda em cache (IndexedDB) e só baixa de novo se mudou.
4. **Curadoria:** Django Admin para o banco global (com upload de texturas e miniaturas); tela própria no app para o banco do escritório.
5. **Seeds e importação:** `python manage.py seed_library` carrega `library_seed/`; `python manage.py import_library --kind materials arquivo.xlsx` para planilhas de fabricantes (Duratex, Guararapes, Arauco etc. — com dados que você tenha direito de usar).

### 4.4 API (resumo)

```
POST   /api/auth/login/  logout/  csrf/  me/
GET    /api/orgs/current/              PATCH (Minha marca: nome, logo, cores)
GET    /api/projects/?search=&status=  POST
GET    /api/projects/{id}/             PUT (If-Match)   DELETE
GET    /api/projects/{id}/versions/    POST .../versions/{rev}/restore/
POST   /api/projects/{id}/duplicate/
GET    /api/projects/{id}/memorial.pdf
POST   /api/assets/presign/            → URL de upload direto para o S3
GET    /api/library/bundle/            (ETag)
CRUD   /api/library/{disciplines,items,materials,handles,hardware,joinery-types,presets,rules,details,sheet-templates}/?scope=global|org
```

Permissões: tudo filtrado por `request.user` → organização ativa; papéis owner/editor/viewer em `Membership`; banco global só editável por staff.

### 4.5 Front — núcleo e renderizadores

```
frontend/src/core/
  units.ts · geometry/ · drawing/ (Line, Polyline, Rect, Arc, Text, Dimension, Hatch, Image)
  dimensions/ (cotas em cadeia)
  joinery/ model.ts · rules.ts (lê RuleProfile) · solve.ts · validate.ts · specs.ts
           views/plan.ts · views/front-internal.ts · views/front-external.ts
  sheets/ (folha, carimbo, viewports, escala automática)
  project/ schema.ts (zod) · migrations/ · export-json-schema.ts
```

Princípio: `documento + bancos → núcleo → primitivas → renderizadores (SVG / PDF / three)`. Renderizador não calcula.

### 4.6 Regras de marcenaria iniciais (seed do `RuleProfile` global)
- Chapa MDF 2750 × 1840 mm → peça maior gera **emenda**.
- Corpo 18 mm; fundo 6 mm recuado 10 mm; porta 18 mm sobreposta; folga 3 mm.
- Dobradiças: 2 até 900 mm de altura, 3 até 1600, 4 acima.
- Vão livre mínimo de módulo: 100 mm (aviso bloqueante).
- Portas com diferença > 2 mm → aviso + ação "igualar portas".

São pontos de partida: valide com um marceneiro.

---

## 5. Fases de execução no Claude Code

> **Ordem ajustada (31/10/2026):** depois das Fases 0 e 1, foi feito primeiro um **editor com
> blocos rodando no navegador**: o essencial das Fases 4 e 5, com o projeto salvo no
> navegador (IndexedDB) e PDF A3 por ambiente. O objetivo foi validar cedo o diferencial do
> produto (montar o layout no sistema com blocos paramétricos). As Fases 2 e 3 vêm em seguida
> e ligam esse editor ao servidor e ao banco, com o mesmo formato de documento (schema zod) e
> de bloco (ADR 004). Pendente das Fases 4–5: PDF como planta base (pdf.js), marcadores
> numerados e legenda, disciplinas como filtro, área (m²), guia, modo humanizada, preço,
> fornecedor e aprovação no painel de itens. (Esquadrias como vãos na parede, comprimento digitado e
> ambiente retangular já entraram; depois, marcadores, legenda, áreas e orçamento no painel.)
> Próximas entradas de planta: PDF como base e importação de DXF; DWG via LibreDWG (`dwg2dxf`)
> rodando como programa separado no servidor (GPL-3.0: não linkar nem empacotar no front). Falta das Fases 4–5:
> disciplinas como filtro, guia e modo humanizada.


Cada fase = um branch + PR, começando em **plan mode**, com `/clear` entre fases.

### Fase 0 — Monorepo, Docker e spikes (2 dias)
- `docker-compose.yml` com postgres, S3 local (SeaweedFS — ADR 002), redis, backend (Django), frontend (Vite com proxy `/api` → Django).
- Django: settings divididos, custom `User` **antes da primeira migration**, DRF, drf-spectacular, django-storages, ruff, pytest. `/api/health/`.
- Front: Vite + React + TS, ESLint, Vitest, Playwright, script `gen:api` (openapi-typescript).
- Spikes: SVG com pan/zoom e 2 000 linhas; PDF A3 vetorial 1:50 com cota e fonte embutida (jsPDF + svg2pdf); three.js com 10 caixas texturizadas.

**Pronto quando:** `docker compose up` sobe tudo, `/api/health/` responde pelo front, os 3 spikes rodam, `docs/adr/001-pdf.md` registra a decisão do PDF.

> Prompt: *"Leia CLAUDE.md e docs/PLANO.md (seções 3, 4.1 e Fase 0). Monte o monorepo com Docker Compose, o Django com custom User e o front Vite, e implemente os três spikes em frontend/src/spikes/. Para o PDF, gere um A3 em 1:50 com uma parede de 4 m cotada e me diga como conferir a escala."*

### Fase 1 — Núcleo de geometria (front) (2–3 dias)
`core/units`, `geometry`, `drawing`, `dimensions` + renderizadores SVG e PDF + página interna que mostra todas as primitivas na tela e em PDF. Testes de cota em cadeia e formatação pt-BR.

### Fase 2 — Contas, organizações e projetos (backend + front) (3–4 dias)
- `accounts`: login por e-mail, `Organization`, `Membership`, organização ativa na sessão.
- `projects`: `Project`, `ProjectVersion`, `ProjectItemIndex`; save com `If-Match`; validação por JSON Schema; restaurar versão; duplicar.
- `assets`: upload pré-assinado para S3 (SeaweedFS em dev).
- Front: login, lista de projetos, criar projeto/ambiente, autosave, aviso de conflito.
- Schema zod v1 do documento + `export-json-schema` que grava em `backend/apps/projects/schema/`.
- Testes: pytest de permissão entre organizações (um escritório não vê projeto do outro), conflito 409, validação inválida.

> **Feito (03/11/2026).** Cadastro abre conta + escritório (`ALLOW_SIGNUP`; convites na Fase 10). Versões automáticas no máximo a cada 10 min de edição (o autosave é de ~1 s) + versões com nome; restaurar guarda o estado atual antes. `ProjectItemIndex` copia os campos do item (sem numeração de marcador, que é regra do front). Upload: URL pré-assinada com `S3_PUBLIC_ENDPOINT_URL` (`same-origin` em dev, via proxy do Vite — ADR 002). O `/editor` continua como **rascunho local** sem conta e pode ser enviado aos projetos.

### Fase 3 — Bancos (library) (4–5 dias)
- Models da seção 4.3 com `LibraryEntry`, admin com miniaturas e filtros, serializers, `scope=global|org`, sobrescrita por `slug`.
- `GET /api/library/bundle/` com ETag; cache no front (IndexedDB).
- `seed_library` com conteúdo inicial: ~30 itens de catálogo com símbolo, ~20 MDFs, 10 puxadores, 5 tipos de móvel, 1 `RuleProfile`, 1 `SheetTemplate`.
- `import_library` para CSV/XLSX (openpyxl) com relatório de erros por linha.
- Snapshot + "atualizar do banco" no documento.
- Tela "Banco do escritório" no front (listar, criar, editar, sobrescrever item global).
- **Se você tiver mandado um banco existente (planilha/dump) em `docs/material/`, esta fase inclui o mapeamento e o importador dele.**

> **Feito (03/11/2026).** 12 bancos (os da tabela 4.3 + `FloorFinish` para pisos e `SpecTemplate`), formato único do front (zod → JSON Schema → validação no Django) e seed gerado do front (`npm run export:schema` grava `backend/library_seed/`). Snapshot no documento = schema v9 (`librarySnapshots`: blocos `id@versão` + regras). Sobrescrita por `slug` com versão começando em global + 1; inativar no escritório esconde a global. Importação de planilha também pela tela. `docs/material/` continua vazio (sem banco existente para mapear). Ver ADR 005.

### Fase 4 — Planta base e editor (5–7 dias)
- Importar planta (imagem ou 1ª página de PDF via pdf.js) → Asset; **calibrar escala**; travar, opacidade, ver através; **conferir medida**.
- Ferramentas: selecionar, parede, retângulo, cota com snap, texto, guia, área (m²); snap a grade/extremidades/ortogonal; barra do elemento (cor, linha, espessura, preenchimento); disciplinas como filtro; atalhos.

### Fase 5 — Itens, marcadores e legenda (3–4 dias)
- Inserir do **catálogo** (símbolo paramétrico por L×P), mover, girar, espelhar, redimensionar.
- Marcadores numerados por disciplina; painel de itens com preço, fornecedor, status e aprovação; totais.
- Modo humanizada (padrões e texturas do banco de materiais).

### Fase 6 — Pranchas, PDF e memorial (4–5 dias)
- Pranchas A4–A1 com `SheetTemplate`, carimbo, "Minha marca", viewports por disciplina, escala automática, escala gráfica, legenda.
- PDF de uma prancha ou de todas (cliente).
- **Memorial PDF no servidor** (WeasyPrint) a partir do `ProjectItemIndex`: por ambiente/disciplina, marcador, item, qtd, especificação, marca, fornecedor, preço, total.

> **Feito (03/11/2026).** Folha por ambiente (schema v10: `Environment.sheet` + `librarySnapshots.sheetTemplate`), carimbo com "Minha marca" (campos no `Organization`, logo como `Asset`) e as notas do modelo de folha, legenda embaixo em folha estreita, PDF de uma prancha. Memorial: o núcleo calcula o RELATÓRIO (`core/project/report.ts`: linhas da legenda e do orçamento, com marcador e pisos com perda) e o envia em cada save; o servidor valida (JSON Schema exportado), grava em `Project.report`, refaz o `ProjectItemIndex` com marcador/disciplina e imprime com WeasyPrint (fontes do design system embutidas). Pendentes da fase: viewports por disciplina numa mesma folha; `DimStyle` do `SheetTemplate`.

**Marco:** produto usável sem marcenaria.

### Fase 7 — Motor de marcenaria (núcleo, TDD) (5–7 dias)
- `joinery/model, rules (lê RuleProfile do banco), solve, validate, specs` + 3 vistas cotadas.
- Caso de teste do vídeo: rack 3180 × 450 × 400 suspenso 100 mm, módulos 909/909/909/303, 7 portas, fecho toque, fundo recuado → vãos 882/891, portas 452/451/101, aviso de módulo < 100 mm, especificações 1–12.
  > **Nota (03/11/2026, implementado):** os números acima misturam duas telas do vídeo (uma com canto curvo R15 e módulos 90,9/90,9/90,9/30,3 = 303; outra com canto R20 e porta de 10,1). Cantos curvos são pós-MVP, então o caso de aceite ficou, com as regras da seção 4.6: rack 3180 × 450 × 400 suspenso 100, módulos 909/909/909/453 → vãos 882/891/891/426, portas 452/451 (×3) + 450, 14 dobradiças, emenda de tampo/base/fundo sobre a divisória a 2727 mm; módulo de 112 → vão 85 → erro "não dá para montar"; portas 452 × 224 → aviso + "igualar portas" (4 × 795). Ver `frontend/src/core/joinery/*.test.ts`.

### Fase 8 — Assistente de detalhamento (UI) (5–7 dias)
Os 6 passos da seção 1.2, com **modelos prontos do banco** (`JoineryPreset`), puxadores e ferragens do banco, avisos com ações, geração/atualização das pranchas de detalhe e inserção de blocos do **banco de detalhes**.

### Fase 9 — 3D e acabamentos (4–5 dias)
`Panel[]` → meshes; fechado/aberto; materiais e texturas do banco; sentido do veio; captura PNG para a prancha de perspectivas.

Primeira entrega implementada em `fase-9-3d`. No editor, abra a aba **3D**, escolha o ambiente ou um móvel e alterne **Abrir portas e gavetas**. Os móveis detalhados usam o motor de marcenaria e os acabamentos copiados do banco. Paredes respeitam altura, peitoris e vergas; pisos usam a cor escolhida. Os 31 blocos embutidos têm modelos próprios, incluindo camas, estofados, mesas, cadeiras, louças e eletrodomésticos. A marcenaria ainda sem desenho recebe uma prévia pelo tipo do banco. **Capturar PNG** exporta a câmera atual; **Prancha de perspectiva (PDF)** gera uma folha A3 avulsa, sem escala. As texturas de MDF são procedurais, com direção do veio. Permanecem para as próximas entregas as texturas fotográficas, a persistência das perspectivas na lista de pranchas e a integração de render por IA. Uso no iPad já conferido em WebKit; gestos de pinça e navegação da planta por toque são o próximo ajuste solicitado.

### Fase 10 — Produto e deploy (3–5 dias)
Minha marca completa, convites para a organização, papéis, compartilhamento só-leitura por link, logs, backup do Postgres, deploy (ex.: EC2/Lightsail ou ECS + RDS + S3 + CloudFront; ou um VPS com Docker Compose + Caddy para começar barato).

### Fase 11 — Pós-MVP
Cantos arredondados, ripado, correr/basculante completos, lista de peças e plano de corte para o marceneiro, aprovação do cliente por link, DXF, integração com o Check Pro (API entre os dois Djangos ou app compartilhado).

**Estimativa do MVP (Fases 0–10):** ~7 a 10 semanas de trabalho focado com o Claude Code.

---

## 6. Material que você vai enviar depois

Coloque tudo em `docs/material/` com um `LEIAME.md` curto dizendo o que é cada arquivo. Como cada tipo entra no projeto:

| Material | Onde vai | Fase que usa |
|---|---|---|
| Mais vídeos/prints do sistema de referência | `docs/referencia/` (numerados) + 1 linha de descrição no `LEIAME.md` | A fase da tela correspondente |
| Planilhas de MDF, puxadores, ferragens, móveis | `docs/material/bancos/` → convertidas em `backend/library_seed/` via `import_library` | Fase 3 |
| Banco de dados existente (dump SQL, CSV, Access, Excel) | `docs/material/banco-existente/` → Claude Code analisa e escreve o mapeamento para os models da seção 4.3 | Fase 3 |
| Pranchas PDF reais do escritório (modelo de carimbo, padrão de cotas) | `docs/material/pranchas/` → vira `SheetTemplate` e referência visual de cota/texto | Fase 6 |
| Detalhes padrão (DWG/PDF de detalhes de marcenaria) | `docs/material/detalhes/` → viram `DetailBlock` (redesenhados em primitivas) | Fase 8 |
| Regras do marceneiro (espessuras, folgas, chapa) | `docs/material/regras.md` → seed do `RuleProfile` | Fase 7 |

Com o material novo, peça ao Claude Code: *"Leia docs/material/LEIAME.md e os arquivos novos; atualize docs/PLANO.md (escopo, models dos bancos e fases afetadas) e me mostre o diff antes de implementar."*

---

## 7. Como rodar isso no Claude Code

1. `mkdir prancheta && cd prancheta && git init`; copie `CLAUDE.md` e `docs/` para a raiz.
2. `claude` → prompt da Fase 0.
3. Para cada fase: branch `fase-N-nome` → plan mode → *"Leia CLAUDE.md e a Fase N de docs/PLANO.md; veja as imagens relevantes em docs/referencia/ e docs/material/. Proponha o plano com arquivos, migrations e testes."* → revise → implemente → *"Rode ruff, pytest, lint, typecheck, vitest; abra o app com Playwright e tire screenshots."* → commit/PR → `/clear`.
4. Ao fim de cada fase, peça para atualizar "Estado atual" no `CLAUDE.md`.

Dicas:
- Migrations: peça para o Claude Code mostrar a migration gerada antes de aplicar; nunca editar migration já commitada.
- Fase 7 em TDD estrito, com números exatos.
- Fase grande demais (> ~1 dia de conversa) → quebrar em sub-fases.

---

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| PDF não vetorial ou fora de escala | Spike na Fase 0 + teste que mede distância no PDF |
| Geometria espalhada pela UI | Núcleo puro; "renderizador não calcula" e "backend não calcula geometria" no CLAUDE.md |
| Formato do projeto divergir entre front e back | zod → JSON Schema gerado → validado no Django; tipos da API gerados do OpenAPI |
| Mudança no banco quebrar projeto antigo | `version` + snapshot no documento + "atualizar do banco" explícito |
| Dois usuários editando o mesmo projeto | `revision` + `If-Match` → 409 com opção de recarregar ou salvar como cópia |
| Vazamento entre escritórios | Queryset sempre filtrado por organização + testes de permissão na Fase 2 |
| Dados de fabricantes (texturas, catálogos) com direitos | Usar só material com licença ou fornecido pelo fabricante; texturas próprias no seed |
| Escopo explodir | MVP fechado na seção 2; pós-MVP só após a Fase 10 |
| Propriedade intelectual | Funcionalidade é livre; nome, marca, textos, ícones e visual próprios |
