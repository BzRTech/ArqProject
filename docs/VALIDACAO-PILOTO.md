# Validação integrada - 23/11/2026

Consolidação das cinco entregas de `fase-9-3d` posteriores à integração anterior
em `main`: catálogo 3D, importação de PDF, gestos no iPad e perspectivas persistidas.
O protótipo anterior e seus dados locais foram preservados em outra pasta.

## Ambiente e resultados

- Windows, Node 24, backend em Docker com Python 3.12 e PostgreSQL 16.
- Ruff e 75 testes pytest passaram com PostgreSQL real.
- 503 testes Vitest passaram; lint, typecheck e build passaram.
- 32 testes Chromium passaram, incluindo o novo `e2e/pilot.spec.ts`.
- 4 testes WebKit/iPad passaram: PDF, perspectivas, edição por toque e catálogo 3D.
- PDF vetorial A3: tamanho físico e segmentos em escala conferidos pelo teste de primitivas.
- Piloto: importação de PDF real de uma página, salvamento do asset no S3 local,
  ambiente de ensaio separado com 4400 × 3800 mm, sofá e rack de 3180 × 450 × 400 mm,
  detalhamento, captura 3D, PDF com quatro pranchas e memorial com preço de ensaio.
- Versão nomeada salva, projeto alterado e restaurado pela interface; nova sessão
  autenticada confirmou geometria, planta e perspectiva recuperadas do servidor.
- Screenshots e PDF renderizado inspecionados visualmente. Dados e documentos
  particulares ficam fora do Git, junto dos artefatos locais do teste.

O teste usa a imagem sintética do repositório por padrão. Para repetir com um PDF
particular, defina `PILOT_PDF` com seu caminho absoluto; requer backend e S3 ativos.

```powershell
cd frontend
$env:E2E_BASE_URL = 'http://localhost:5173'
$env:PILOT_PDF = 'C:\caminho\planta.pdf'
npx playwright test e2e/pilot.spec.ts --workers=1
```

## Correções e limites

`.gitattributes` garante LF nos scripts `.sh`, necessário ao executar o entrypoint
Linux a partir de um checkout Windows com `core.autocrlf=true`. README passa a
orientar checkout de `main`. O teste integrado passa a cobrir a restauração de
assets em uma sessão nova, sem depender do cache do navegador original.

A importação de PDF rasteriza uma página como base: não reconstrói paredes ou
marcenaria automaticamente. A planta particular não foi transformada em projeto
executivo, e ainda exige calibração e modelagem pelo arquiteto. O ambiente de ensaio
é explicitamente identificado como não executivo. O arquivo SKP grande foi localizado,
mas não convertido: o editor atual não tem importador SketchUp.

## Próximas entregas

1. Compartilhamento somente leitura por link revogável, vinculado a uma versão,
   com acesso controlado aos assets e testes entre escritórios.
2. Comentários e aprovação do cliente por revisão, preservando autoria e histórico.
3. Publicação com domínio, HTTPS, backups e armazenamento configurados para produção.
   O ambiente validado aqui é apenas local.
4. Prova de conceito LiDAR: app iOS com RoomPlan envia geometria estruturada;
   adaptador no Prancheta converte metros para milímetros e cria paredes e vãos
   revisáveis. Exige aparelho compatível, teste físico e tratamento de confiança,
   espessuras inferidas e elementos não reconhecidos. Não está implementado.

Referência: [Apple RoomPlan](https://developer.apple.com/augmented-reality/roomplan/).
O editor e a gestão podem continuar web; a captura RoomPlan precisa de integração
nativa, inclusive se a interface móvel usar uma aplicação híbrida.
