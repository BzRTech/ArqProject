# Prancheta

Sistema web para projetos de interiores: planta baixa sobre planta importada, itens com
marcadores e legenda, detalhamento paramétrico de marcenaria, bancos de conteúdo e pranchas e
memorial em PDF.

- Plano completo: [`docs/PLANO.md`](docs/PLANO.md)
- Regras para quem desenvolve (inclusive o Claude Code): [`CLAUDE.md`](CLAUDE.md)
- Decisões de arquitetura: [`docs/adr/`](docs/adr/)

## Subir o ambiente

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

## Spikes da Fase 0

Em `frontend/src/spikes/`, acessíveis pelo menu do app:

- **Pan/zoom SVG**: 2 000 linhas, zoom no cursor, contador de fps.
- **PDF A3 1:50**: parede de 4 m cotada, fonte embutida. Como conferir a escala: imprimir em A3
  a 100% ("tamanho real") e medir a parede, que deve ter **80 mm**; a escala gráfica de 5 m deve
  ter **100 mm**. O teste `pdfScale.test.ts` e o e2e fazem essa medição automaticamente no PDF.
- **3D**: 10 caixas com texturas procedurais de MDF (three.js + @react-three/fiber).
