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
