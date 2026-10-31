# core — núcleo de geometria (TypeScript puro)

Sem React, DOM ou three. Checado por `tsconfig.core.json` (sem `lib: DOM`) e pelo ESLint.

## Convenções

- **Modelo em milímetros inteiros.** Coordenadas de projeto são mm reais.
- **Eixo y para baixo** (como SVG, tela e imagens de planta importadas). Ângulos em graus,
  0° = +x, crescendo no sentido **horário visual** (90° aponta para baixo).
- **Espaço de papel em mm.** Espessuras de pena, tamanhos de texto, afastamentos de cota e
  espaçamento de hachura são definidos em mm DE PAPEL — não mudam com a escala.
- Exibição em cm, pt-BR: `45,2` · `318` (sem `,0` quando inteiro) — ver `units.ts`.

## Fluxo

```
Entity[] (modelo, mm)  ──compileView({scale, origin})──▶  Primitive[] (papel, mm)
                                                           │
                         render/svg (SvgNode → markup/React) ◀┘──▶ render/pdf (svg2pdf)
```

`compileView` resolve tudo o que é cálculo (cotas, hachuras, arcos, posição de texto,
padrões de traço). Os renderizadores só traduzem `Primitive` para o formato de saída.
