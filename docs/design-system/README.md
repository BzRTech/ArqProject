# Design system da Prancheta (v1.0)

Referência visual do app, exportada do Claude Design.

- `Prancheta Design System.dc.html`: a página do design system (cores, tipografia, forma, componentes
  e o editor). Abra no navegador; precisa do `support.js` ao lado e de internet para as fontes e
  ícones.
- `tokens.css`: os tokens originais. No app, eles estão em `frontend/src/app/tokens.css`, com as
  fontes servidas pelo próprio app (`@fontsource`), sem Google Fonts.

## Princípios

1. **Silêncio:** o desenho é o protagonista. Os painéis são neutros e nenhuma cor de marca
   compete com a planta.
2. **Precisão:** medidas e códigos sempre em mono (Geist Mono), bordas de 1px e grid de 4px.
3. **Materialidade:** as cores vêm do ateliê: papel, grafite, argila, sálvia, carvalho e
   travertino.

## Regras usadas no código

- **Argila** (`--clay`) é o único acento, reservado para **seleção e foco**:
  - objeto selecionado, alças e área de seleção da esquerda para a direita;
  - anel de foco dos campos (`--clay-soft`).
- A área de seleção da direita para a esquerda (cruzamento) é **sálvia** e tracejada.
- **Grafite** (`--ink`) marca a ação principal (no máximo uma por área) e a ferramenta ativa.
- **Fontes:**
  - **Instrument Serif:** títulos.
  - **Montserrat:** interface.
  - **Geist Mono:** medidas, códigos e atalhos.
- **Sombra** só no que flutua: barra de ferramentas, opções da vista e aviso (toast). Os painéis
  usam borda de 1px.
- **Ícones:** Lucide (`lucide-react`), traço 1,5.
- **O desenho técnico** (penas, hachuras, cotas, PDF) segue a norma e não o tema. O tema muda só
  as cores da interface sobre ele: seleção, guias e grade.
