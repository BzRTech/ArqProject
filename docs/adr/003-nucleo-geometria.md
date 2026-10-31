# ADR 003 — Convenções do núcleo de geometria

- **Status:** aceito (Fase 1)
- **Data:** 2026-10-31

## Contexto

Tela, PDF e (depois) 3D precisam desenhar exatamente a mesma coisa. O plano exige um núcleo
TypeScript puro (`frontend/src/core`) e renderizadores que não calculam.

## Decisões

1. **Modelo em mm inteiros; eixo y para baixo.** Igual a SVG, tela e imagens de planta
   importadas, sem inversão de eixo em lugar nenhum. Ângulos em graus, 0° = +x, positivo =
   horário visual.
2. **Dois espaços:** modelo (mm reais) e papel (mm de papel). Pena, corpo de texto, afastamento
   de cota, traço e espaçamento de hachura são definidos **em mm de papel**: não mudam com a
   escala (como penas de CAD).
3. **`Entity` → `compileView(entities, {scale, origin})` → `Primitive`.** As entidades podem
   ser de alto nível (cota, cadeia, hachura, retângulo, arco por ângulo, texto com alinhamento
   vertical). As primitivas são finais, em mm de papel: linha, polilinha, círculo, arco com
   pontos e flags prontos, texto com ponto de linha de base já calculado, imagem e grupo com
   `role`.
4. **Renderizadores só traduzem.** `render/svg` gera uma árvore `SvgNode` neutra, que vira
   markup (para o PDF) ou elementos React (para a tela). `render/pdf` passa o markup ao svg2pdf.
   Tela e PDF saem da mesma árvore.
5. **Cotas:**
   - traço oblíquo a 45°;
   - texto em cm pt-BR (`45,2`, `318`), legível de baixo ou da direita (NBR 10126);
   - texto do lado de fora em relação ao objeto;
   - em cadeia, os valores vêm das posições acumuladas arredondadas, então a soma dos vãos é
     sempre igual ao total;
   - texto que não cabe no vão vai para fora (primeiro e último vão) ou é escalonado (vãos do
     meio);
   - a largura do texto é estimada com as métricas da Roboto em `text-metrics.ts`, porque o
     núcleo não tem acesso a fontes.
6. **Hachura** é recortada no núcleo (par-ímpar, aceita côncavos e furos) e sai como linhas,
   ancorada em meio espaçamento para não cair sobre contornos de medida redonda. Não usamos
   `<pattern>` do SVG, que é frágil no PDF.
7. **Pureza garantida por ferramenta:** `tsconfig.core.json` compila `src/core` **sem a lib
   DOM**, e o ESLint proíbe importar React ou three em `src/core`.

## Consequências

- O alinhamento de texto depende de métricas aproximadas. Se ficar visível em algum caso,
  trocar a tabela por métricas extraídas da fonte (um JSON gerado uma vez).
- O estilo de cota (`DimStyle`) hoje é uma constante. Na Fase 6 passa a vir do `SheetTemplate`
  do banco.
- O editor da Fase 4 deve reaproveitar `compileView` para a tela, com pan/zoom em volta da
  árvore SVG, como na página `/dev/primitivas`.
