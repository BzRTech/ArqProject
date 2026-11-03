# Prancheta

Sistema web para projetos de interiores: planta baixa sobre planta importada, itens com
marcadores e legenda, detalhamento paramétrico de marcenaria, bancos de conteúdo e pranchas e
memorial em PDF.

- Plano completo: [`docs/PLANO.md`](docs/PLANO.md)
- Regras para quem desenvolve (inclusive o Claude Code): [`CLAUDE.md`](CLAUDE.md)
- Decisões de arquitetura: [`docs/adr/`](docs/adr/)

## Testar na sua máquina (só o editor, sem Docker)

O **rascunho local** (`/editor`) roda inteiro no navegador e salva no próprio navegador. Para
testar basta o **Node.js 22.12 ou mais novo** ([nodejs.org](https://nodejs.org), versão LTS) e o
**Git**. Login e projetos salvos no servidor (`/projetos`) precisam do ambiente completo (Docker,
abaixo).

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

Na primeira subida o backend aplica as migrations e cria o bucket. Abra
**http://localhost:5173/projetos**, clique em **Criar conta** (nome, e-mail, senha e nome do
escritório) e pronto. Depois de atualizar o código (`git pull`), rode `docker compose up --build`
para o backend instalar dependências novas e aplicar as migrations. Para criar um admin:

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

O visual segue o design system em [`docs/design-system/`](docs/design-system/).

### Passo a passo: as 5 abas de cada ambiente

Cada ambiente tem **5 abas numeradas**, na ordem de trabalho. Todas mostram a mesma planta, mas
cada uma só deixa mexer no que é dela; o resto aparece mais claro e não responde ao clique. No
painel da direita, o **passo a passo** da aba marca sozinho o que já foi feito e tem um botão que
leva à ferramenta certa. A aba ganha um ✓ quando os passos obrigatórios estão feitos.

1. **Planta:** desenhe o ambiente (ferramenta Ambiente: medidas internas), coloque portas,
   janelas e pilares e **cote as paredes** (por fora, com os vãos; por dentro, a área útil).
2. **Layout:** insira os móveis do catálogo, preencha marca e preço (legenda e orçamento) e, se
   quiser, cote a posição dos móveis até as paredes.
3. **Piso:** crie a área do ambiente, escolha o revestimento e ajuste paginação e rodapé.
4. **Marcenaria:** insira os móveis planejados (guarda-roupa, rack…) e escolha os
   **acabamentos**: MDF liso ou madeirado para as **frentes** (portas e gavetas), o **corpo**
   (caixa por dentro) e o **tamponamento** (laterais, tampo e base aparentes). "Tudo" pinta o
   móvel inteiro; depois dá para trocar uma parte só. Escolha o sentido do veio e escreva as
   observações para o marceneiro (uma por linha). Com **Humanizado** ligado, o móvel aparece
   com a cor do MDF na planta e no PDF, e o acabamento sai na legenda e na planilha.
   **Detalhar** (passo a passo ou "Detalhar este móvel"): altura, base (piso, suspenso ou
   rodapé), **módulos** com largura eixo a eixo, frente (aberto, 1 ou 2 portas, gavetas) e
   prateleiras, e o puxador. O sistema calcula vãos, portas, dobradiças e emendas e avisa o que
   não dá para montar (vão menor que 10 cm) ou o que está desigual ("Igualar portas"). **Ver
   vistas** mostra a prancha de detalhe: vista frontal, vista interna e planta, cotadas, com as
   especificações numeradas. A lista de peças fica no painel.
5. **Pranchas:** a folha A3 de cada ambiente e a de detalhe de cada móvel de marcenaria, iguais
   às do PDF. Baixe o PDF daqui ou do botão no topo.

Os atalhos de teclado levam à aba da ferramenta (W na aba Layout abre a Planta com a Parede).


- **Onde fica cada coisa:**
  - **Barra superior:** "Importar planta" e "Baixar PDF".
  - **Rodapé da área de desenho:** barra de ferramentas (passe o mouse sobre um ícone para ver o
    nome e o atalho), atalhos do teclado e zoom (100% = escala 1:50 em tamanho real).
  - **Topo da área de desenho:** Humanizado, Cursor CAD e unidades.
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
- **Esquadro (ângulo reto):** ao arrastar um canto, ele gruda nas posições que deixam um ângulo
  de 90° (no próprio canto ou nos vizinhos) ou alinham com os vizinhos. O canto a 90° ganha o
  símbolo de ângulo reto; os outros mostram os graus. Com a parede selecionada, os cantos fora do
  esquadro mostram o ângulo. Shift desliga.
- **Pilar (L):** clique num canto de parede (entra centrado no canto) ou sobre uma parede (centrado
  no eixo e alinhado a ela). É desenhado cheio (preto), como estrutura cortada. No painel:
  retangular ou circular, largura × profundidade (ou diâmetro) e rotação; R gira 90°.
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
- **Cotar parede:** com a parede selecionada, gera por fora as cotas em cadeia (com os vãos de
  portas e janelas) e por dentro a **área útil** (de face a face). Elas **acompanham a parede**:
  mudou a parede, mudou a cota. Dá para afastar ou apagar cada uma.
- **Cotar posição dos móveis:** no painel do móvel, "Cotar posição" mostra a folga de cada lado
  até a parede (só os lados que não estão encostados). No painel do ambiente, "Cotar todos os
  móveis". As cotas acompanham o móvel quando ele anda.
- **Tapetes** (Estar: retangular e redondo) ficam sempre por baixo dos outros móveis.
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
- **Mover a vista:** arraste com o **botão do meio** (a rodinha), como no LibreCAD, ou com o
  botão direito, ou segurando **Espaço**. A rodinha girando dá o zoom.
- **Edição:** R gira, M espelha, Ctrl+D duplica, Del exclui, Ctrl+Z / Ctrl+Shift+Z desfaz e
  refaz, F enquadra.
- **Importar planta:** carregue uma imagem (botão na barra superior, ou arraste-a até o quadro
  "Planta base" no painel da direita), clique em dois pontos de medida conhecida e informe a
  distância real.
- **Baixar PDF:** gera uma prancha A3 por ambiente, na maior escala que couber.

Há prints em [`docs/prints/editor/`](docs/prints/editor/).

## Contas e projetos no servidor (Fase 2)

- **Entrar / Criar conta** (`/entrar`): a conta cria também o escritório (você vira o dono).
  Cada pessoa pode participar de mais de um escritório; o seletor fica na barra superior.
  Papéis: dono, editor e leitor (o leitor vê, mas não altera).
- **Projetos** (`/projetos`): busca por nome ou cliente, filtro por situação (rascunho, em
  aprovação, aprovado, arquivado), novo projeto, duplicar, arquivar, excluir e **versões**.
- **Salvamento:** o editor salva sozinho no servidor cerca de 1 s depois de cada mudança.
  Cada save leva a revisão que a tela conhece; se outra aba ou outra pessoa salvou antes, aparece
  o aviso de **conflito** e o salvamento para até você escolher: **Usar a versão salva** (descarta
  as suas mudanças não salvas) ou **Manter a minha** (grava por cima). Sem internet, a tela mostra
  "Sem conexão" e tenta de novo; ao fechar a aba com algo pendente, uma cópia fica no navegador e
  é enviada quando o projeto for aberto de novo.
- **Versões:** uma automática a cada ~10 min de edição, mais as que você salvar com nome
  ("Enviado ao cliente"). **Restaurar** guarda o estado atual como versão antes.
- **Planta base:** a imagem vai para o armazenamento do escritório (S3) e o navegador guarda uma
  cópia. Abrindo em outro computador, ela é baixada do servidor.
- **Rascunho local → conta:** o que você fez em `/editor` (sem conta) vai para os projetos pelo
  botão **Enviar rascunho**. Um projeto baixado em `.json` volta por **Abrir .json**.

Prints em [`docs/prints/fase-2/`](docs/prints/fase-2/).

## Banco do escritório (Fase 3)

O catálogo de blocos, os MDFs, os pisos, os puxadores, as ferragens, os tipos de móvel, os
modelos prontos, as regras de marcenaria, as folhas e os textos padrão vêm agora do **banco**:

- **Banco global** (do sistema): carregado na subida do backend (`manage.py seed_library`) e
  curado no Django Admin (`/admin/`, só staff).
- **Banco do escritório** (menu **Banco**): **Personalizar** cria uma cópia de uma entrada global
  que passa a valer só no seu escritório (ex.: o "Padrão" das regras de marcenaria com a sua
  folga de portas); **Novo** cria um MDF, piso, puxador etc.; no catálogo, **Duplicar** cria um
  bloco a partir de um parecido. Desativar uma entrada esconde ela do editor.
- **Importar planilha** (MDF, pisos, puxadores, ferragens, textos): CSV ou XLSX com cabeçalho; a
  tela mostra as colunas, confere antes e lista os erros por linha. Pela linha de comando:
  `docker compose exec backend python manage.py import_library --kind materials arquivo.xlsx
  --org <escritorio>` (sem `--org` vai para o banco global).
- **Projetos não mudam sozinhos:** cada projeto guarda uma cópia do que usa. Quando o banco tem
  versão nova de um bloco ou das regras, o editor avisa ("Há versões novas no banco") e você
  escolhe atualizar item a item ou tudo.
- O rascunho local (`/editor`, sem conta) usa o banco embutido.

Prints em [`docs/prints/fase-3/`](docs/prints/fase-3/).

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
