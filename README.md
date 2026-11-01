# Prancheta

Sistema web para projetos de interiores: planta baixa sobre planta importada, itens com
marcadores e legenda, detalhamento paramétrico de marcenaria, bancos de conteúdo e pranchas e
memorial em PDF.

- Plano completo: [`docs/PLANO.md`](docs/PLANO.md)
- Regras para quem desenvolve (inclusive o Claude Code): [`CLAUDE.md`](CLAUDE.md)
- Decisões de arquitetura: [`docs/adr/`](docs/adr/)

## Testar na sua máquina (só o editor, sem Docker)

O editor roda inteiro no navegador e salva no próprio navegador. Para testar basta o
**Node.js 22.12 ou mais novo** ([nodejs.org](https://nodejs.org), versão LTS) e o **Git**.

```bash
git clone https://github.com/BzRTech/ArqProject.git
cd ArqProject
git checkout fase-editor-blocos      # (ou main, depois que os PRs forem mesclados)
cd frontend
npm ci
npm run dev
```

Abra **http://localhost:5173/editor**. A tela inicial vai mostrar "API: indisponível", o que é
esperado sem o backend; o editor funciona normalmente. Para parar, use Ctrl+C no terminal.
Para atualizar depois (na pasta `ArqProject`):

```bash
git pull
cd frontend
npm ci
npm run dev
```

Use **`npm ci`** (e não `npm install`): ele instala exatamente as versões do projeto e não altera o
`package-lock.json`. Se um `git pull` reclamar que esse arquivo "would be overwritten", descarte a
alteração local com `git checkout -- frontend/package-lock.json` e repita o `git pull`.

Sem Git: no GitHub, escolha a branch `fase-editor-blocos` → **Code → Download ZIP**, descompacte
e rode os mesmos comandos a partir da pasta `frontend`.

## Subir o ambiente completo

Requer Docker com Compose v2.

```bash
cp .env.example .env        # opcional; os valores padrão já servem para dev
docker compose up
```

| Serviço  | Endereço                                   |
|----------|--------------------------------------------|
| Front    | http://localhost:5173                      |
| API      | http://localhost:8000/api/health/          |
| OpenAPI  | http://localhost:8000/api/docs/            |
| Admin    | http://localhost:8000/admin/               |
| S3 (dev) | http://localhost:8333 (SeaweedFS)          |

Na primeira subida o backend aplica as migrations e cria o bucket. Para criar um admin:

```bash
docker compose exec backend python manage.py createsuperuser
```

## Rodar sem Docker

Backend (Python 3.12, [uv](https://docs.astral.sh/uv/), Postgres 16 local):

```bash
cd backend
uv sync
uv run python manage.py migrate
uv run python manage.py runserver
```

Front (Node 22):

```bash
cd frontend
npm install
npm run dev
```

## Verificações

```bash
# backend
docker compose exec backend pytest
docker compose exec backend ruff check .

# front
cd frontend
npm run lint && npm run typecheck && npm test
npm run test:e2e        # precisa do backend rodando
npm run gen:api         # regenera src/api/schema.d.ts a partir do OpenAPI
```

## Editor de planta

Em **http://localhost:5173/editor**:

- **Blocos:** clique num bloco do catálogo e depois na planta, ou arraste o bloco. Mude L × P
  no painel da direita e o bloco se redesenha (travesseiros, portas, módulos e assentos
  acompanham a medida).
- **Unidades (canto da barra):** paredes em **m** ou cm, móveis e esquadrias em **cm** ou mm
  (padrão: m e cm; fica salvo no navegador). Escrever a unidade no campo sempre vale: "350cm"
  num campo em metros, "4,4 m" num campo em cm. Espessura de parede é sempre em cm.
- **Ambiente (A):** informe largura e profundidade **internas** e clique para posicionar. As
  paredes saem com a espessura escolhida.
- **Parede (W):** clique no primeiro ponto e **digite o comprimento** (na unidade das paredes) + Enter (a direção
  segue o mouse), ou clique nos pontos. Clique no primeiro ponto para fechar. Shift desliga o
  modo ortogonal.
- **Cursor CAD** (na barra): cruz em tela cheia, como no LibreCAD, com marcador de snap (quadrado =
  extremidade, triângulo = ponto médio).
- **Cantos:** passe o mouse sobre qualquer canto de parede (ele fica laranja) e arraste. Não precisa
  selecionar a parede antes.
- **Editar parede:** selecione a parede e arraste os **quadrados** (cantos) ou os **círculos**
  (meio do trecho: empurra a parede). No painel, digite o comprimento de cada trecho. Duplo
  clique na parede cria um canto; duplo clique num canto o remove.
- **Cômodos encostados** (quarto + banheiro): desenhe cada um com a ferramenta Ambiente, encostado
  no outro. As paredes sobrepostas viram uma só no desenho e no PDF, a porta entre eles corta as
  duas, e mexer na parede compartilhada leva os dois cômodos juntos.
- **Centralizar porta/janela:** perto do meio da parede a peça gruda no centro (marca laranja).
  Enquanto posiciona, aparecem as cotas livres até as faces internas dos dois lados, e no painel há
  o botão "Centralizar no trecho".
- **Porta (P) e Janela (J):** clique sobre uma parede, e o lado do cursor define para onde a
  porta abre. A parede é recortada. Arraste para deslizar a peça, use R para abrir para o
  outro lado e M para inverter a dobradiça. Há 3 tipos de porta e 5 de janela na seção
  "Esquadrias" do catálogo.
- **Cotar parede:** com a parede selecionada, gera as cotas em cadeia pela face externa, com
  os vãos.
- **Marcadores e legenda:** cada item ganha um balão numerado (marcenaria usa M01, M02…).
  Itens iguais dividem o número e somam a quantidade. Arraste o balão para tirá-lo de cima do
  desenho. A legenda sai na prancha do PDF.
- **Orçamento:** no painel do item há quantidade, unidade, preço, marca/modelo, fornecedor,
  observação, "existente" e "aprovado". O painel do ambiente mostra a legenda com os totais do
  ambiente e do projeto, e **Exportar planilha (CSV)** abre direto no Excel.
- **Piso:** selecione uma área e escolha o **revestimento** (porcelanatos, cerâmica, pedra, madeira,
  vinílico e laminado em régua, cimento queimado, carpete). A paginação é desenhada em escala:
  peça, junta, grade ou amarração 1/2 e 1/3, direção (horizontal, vertical ou 45°), início
  centralizado ou pelo canto. A quantidade a comprar já inclui a **perda** (arredondada para
  cima), e o **rodapé** é medido pelo perímetro **descontando as portas**. Os dois entram no
  orçamento (P1, P2…), na legenda e na planilha. **Humanizado** (na barra) liga a cor dos pisos.
- **Área (Q):** clique nos cantos (com snap nas faces das paredes). Numa parede fechada, o botão
  "Criar área do ambiente" faz isso sozinho. O rótulo com o m² também se arrasta.
- **Cota (C):** clique nos dois pontos e mova para afastar a cota.
- **Texto (T).**
- **Selecionar vários:** arraste num espaço vazio. **Da esquerda para a direita** (retângulo azul)
  pega só o que ficar inteiro dentro; **da direita para a esquerda** (verde, tracejado) pega tudo o
  que o retângulo tocar. Shift + clique ou Shift + arrastar soma à seleção; **Ctrl+A** seleciona
  tudo; Esc limpa. O painel mostra quantos de cada tipo e tem "Manter só: Cotas (n)" para filtrar
  antes de apagar com **Del**. Arrastar qualquer objeto do grupo move todos. Para mover a vista:
  botão do meio ou direito do mouse, ou **Espaço** + arrastar.
- **Medidas ao arrastar canto/parede:** aparecem cotas provisórias (em cm, pelo eixo) dos trechos
  que estão mudando, e o rodapé mostra o deslocamento (Δx/Δy). Para um valor exato, digite no
  painel "Trechos".
- **Edição:** R gira, M espelha, Ctrl+D duplica, Del exclui, Ctrl+Z / Ctrl+Shift+Z desfaz e
  refaz, F enquadra.
- **Importar planta:** carregue uma imagem, clique em dois pontos de medida conhecida e
  informe a distância real.
- **Baixar PDF:** gera uma prancha A3 por ambiente, na maior escala que couber.

Por enquanto o projeto fica salvo **neste navegador**. A Fase 2 leva para o servidor. Há prints
em [`docs/prints/editor/`](docs/prints/editor/).

## Núcleo de geometria (Fase 1)

`frontend/src/core` é TypeScript puro: unidades, geometria, primitivas de desenho, cotas e
folhas. As convenções estão em [`frontend/src/core/README.md`](frontend/src/core/README.md) e
no ADR 003. A página **Primitivas** (`/dev/primitivas`) mostra uma prancha A3 de catálogo na
tela e gera o PDF.

Para conferir a escala, imprima o PDF em A3 a 100% ("tamanho real") e meça com régua:
- a parede de cima, trecho esquerdo, tem **34 mm** (1:50);
- o topo do rack na vista frontal tem **159 mm** (1:20);
- o tampo no corte tem **45 mm** (1:10);
- cada escala gráfica tem **100 mm**.

Os testes fazem essa medição automaticamente dentro do PDF. Há prints em
[`docs/prints/fase-1/`](docs/prints/fase-1/).

O spike de **3D** (10 caixas com texturas procedurais) fica até a Fase 9.
