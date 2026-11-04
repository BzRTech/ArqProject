# ADR 002 — S3 local de desenvolvimento: SeaweedFS no lugar do MinIO

- **Status:** aceito (Fase 0)
- **Data:** 2026-10-31

## Contexto

O plano previa MinIO como S3 local. Ao montar o Docker Compose:

- a imagem `minio/minio` **não existe mais no Docker Hub** ("repository does not exist");
- desde o fim de 2025 a MinIO deixou de publicar binários/imagens da edição comunitária, e a
  última imagem em `quay.io/minio/minio` está congelada.

## Decisão

Usar **SeaweedFS** (`chrislusf/seaweedfs`, Apache 2.0, ativo) com o gateway S3 na porta 8333 e
credenciais fixas de dev em `docker/seaweedfs/s3.json`.

O backend continua falando **só S3** (django-storages + boto3); nada no código depende do
SeaweedFS. Em produção o alvo é S3 (ou outro compatível). O bucket é criado por
`python manage.py ensure_bucket`, que funciona com qualquer S3, e roda no entrypoint do
container.

## Verificado

- `create_bucket`, `put_object`, `get_object` e **PUT com URL pré-assinada** (usado no upload
  direto da Fase 2) funcionando via boto3 com assinatura v4 e endereçamento por path.

## Consequências

- Variáveis: `S3_ENDPOINT_URL`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` (ver
  `.env.example`). Se trocar a chave, atualize também `docker/seaweedfs/s3.json`.
- Para voltar ao MinIO (ou usar RustFS, Garage etc.), basta trocar o serviço `s3` do compose.
- ~~Pendência da Fase 2~~ resolvida: as URLs pré-assinadas usam `S3_PUBLIC_ENDPOINT_URL`
  (o host entra na assinatura v4). Em dev o valor é `same-origin`: o backend assina para o
  PRÓPRIO site (`http://localhost:5173/prancheta/...`) e o Vite repassa `/<bucket>/` ao
  SeaweedFS mantendo o `Host` — sem CORS e funcionando em localhost, 127.0.0.1 ou IP da rede.
  Em produção, a URL pública do S3/CDN (com CORS liberando o domínio do app).
