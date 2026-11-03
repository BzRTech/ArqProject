# ADR 005 — Bancos (global + escritório) e cópias no projeto

Data: 03/11/2026 · Situação: aceita

## Contexto

A Fase 3 leva para o servidor o conteúdo que o editor usava embutido no código: catálogo de
blocos, MDFs, pisos, puxadores, regras de marcenaria etc. (PLANO 4.3). Requisitos:

- banco GLOBAL do sistema + banco do ESCRITÓRIO, que pode sobrescrever uma entrada global;
- mudar o banco não pode mudar um projeto antigo sem aviso;
- o rascunho local (`/editor`, sem servidor) precisa continuar funcionando;
- backend não calcula geometria (só guarda, valida formato, versiona e serve).

## Decisão

1. **Formato único do front.** Cada banco tem um schema zod em `core/library/schemas.ts`. Ele
   é exportado como JSON Schema para `backend/apps/library/schema/<banco>.schema.json`
   (`npm run export:schema`, com teste de sincronia) e o backend valida toda entrada por ele.
   Os modelos Django têm colunas próprias (para admin, filtros e planilhas) e convertem de e
   para o formato do front (`to_front` / `set_front`).
2. **Seed vem do front.** O conteúdo inicial do banco global é `core/library/seed.ts` (que reúne
   os catálogos embutidos). O mesmo export grava `backend/library_seed/<banco>.json`, que o
   `manage.py seed_library` carrega (idempotente; muda a versão do que mudou). Sem servidor, o
   editor usa esses mesmos dados.
3. **Sobrescrita pelo `slug`.** `organization` nulo = global. Uma entrada do escritório com o
   mesmo `slug` vale no lugar da global ("Personalizar"); excluí-la volta à global; inativá-la
   esconde a global no escritório. A versão da cópia do escritório começa em `global + 1`, para
   que projetos que usavam a global vejam "versão nova".
4. **Bundle com ETag.** `GET /api/library/bundle/` devolve global + escritório já resolvidos, no
   formato do front. O ETag muda com qualquer alteração visível; o front guarda o bundle no
   IndexedDB e manda `If-None-Match` (304 = usa o cache; sem rede = usa o cache).
5. **Cópias (snapshots) no documento — schema v9.** `Project.librarySnapshots` guarda os blocos
   usados (chave `id@versão`) e as regras de marcenaria do projeto. O item continua com
   `blockId` + `blockVersion` (é o `libraryRef` do catálogo). Acabamentos de MDF e pisos já eram
   copiados nos itens/áreas desde as v4 e v7. Migração v8→v9 copia os blocos embutidos e as
   regras padrão.
6. **Registro de blocos no núcleo.** `core/blocks/catalog.ts` mantém duas camadas: o catálogo
   em uso (banco ou embutido, para o painel e itens novos) e as cópias do projeto aberto (para
   desenhar os itens). `getBlock(id, versão)` prefere a cópia daquela versão. É estado de
   módulo, sem React/DOM — o núcleo continua puro.
7. **Atualizar do banco.** `core/library/updates.ts` compara as cópias com o banco
   (`outdatedBlocks`, `rulesOutdated`). O editor mostra um aviso; "Atualizar" troca a versão
   (o desenho), mantendo tamanho, posição, preço e demais dados do item.

## Consequências

- Projetos são autocontidos: abrem iguais mesmo se o bloco for excluído do banco.
- Editar o banco global é só no Django Admin (staff); o escritório edita o dele em `/banco`.
- Importação de planilha (CSV/XLSX) por `import_library` ou pela tela, com relatório por linha,
  para MDF, pisos, puxadores, ferragens e textos padrão. Catálogo de blocos entra por JSON/seed
  ou duplicando um bloco existente (o símbolo é editado como JSON).
- Bancos ainda sem uso no editor (ferragens, detalhes, folhas, textos, disciplinas) já têm
  modelo, API, seed e tela; entram nas Fases 6 e 8.
