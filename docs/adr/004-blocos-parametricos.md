# ADR 004 — Blocos paramétricos como dados

- **Status:** aceito (editor com blocos)
- **Data:** 2026-10-31

## Contexto

O diferencial do produto é montar o layout no próprio sistema com blocos (cama, rack,
sofá…). Esses blocos precisam:

1. redesenhar-se quando o usuário muda L × P, em vez de esticar uma figura;
2. morar no banco (Fase 3), com versão, globais ou do escritório, e editáveis pelo admin;
3. sair iguais na tela, na miniatura do catálogo e no PDF.

## Decisão

- **O símbolo é só dado** (`BlockSymbol`, JSON). As formas são `rect`, `line`, `polyline`,
  `circle`, `ellipse`, `arc`, `hatch`, `text` e `repeat`. Cada número pode ser uma
  **expressão** (`"w/2 - 30"`, `"max(2, round(w / 450))"`), avaliada por um parser próprio,
  sem `eval`, com as variáveis `w`, `d`, `h`, `i` e `n`.
- **`repeat`** gera elementos que dependem do tamanho: travesseiros pela largura da cama,
  portas do guarda-roupa (~45 cm cada), módulos do rack (~90 cm) e assentos do sofá.
- **Coordenadas locais:** origem no canto de trás à esquerda e encosto/parede em y = 0. O item
  no projeto guarda o centro, a rotação, o espelhamento e `sizeMm`. O núcleo
  (`placeEntity`) espelha, gira e posiciona. Ao espelhar, o arco da porta muda de lado e o texto
  continua legível.
- O item guarda `blockId` + `blockVersion`. Na Fase 3 isso vira `libraryRef {kind,id,version}`
  + snapshot, como no plano.
- Testes garantem que todo bloco desenha dentro de L × P no tamanho padrão, no mínimo e no dobro,
  e que o símbolo sobrevive a um ciclo JSON.

## Consequências

- O catálogo inicial (`core/blocks/catalog.ts`) vira o seed do `CatalogItem` sem conversão.
- Novos blocos não exigem código. Um editor visual de blocos para o escritório pode vir depois.
- Blocos de marcenaria (`joinery: true`) são só a representação em planta. O detalhamento
  (Fases 7–8) gera as vistas a partir do `RuleProfile`.
