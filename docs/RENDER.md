# Ambiente de testes no Render

O Blueprint `render.yaml` cria um serviço Docker gratuito (frontend compilado + Django/Gunicorn
no mesmo domínio). O banco PostgreSQL fica no Neon Free, conectado por `DATABASE_URL`.
O bucket S3/R2 deve existir previamente e ser privado.
Uploads não dependem do disco temporário do Render. Redis não é necessário no fluxo atual.

## Antes de publicar

- O arquivo usa Render Free e não cria banco no Render. Criar o projeto no Neon Free,
  preferencialmente na mesma região do serviço (Virginia), e copiar a string de conexão
  completa, incluindo `sslmode=require`, diretamente para `DATABASE_URL` no Render.
  Não retirar parâmetros SSL fornecidos pelo Neon. Deploy automático está desligado.
- Usar bucket e banco próprios de homologação. Não copiar documentos de clientes sem necessidade.
- Fornecer as credenciais do bucket diretamente no painel de variáveis do Render, nunca no Git.
- S3/R2 deve permitir leitura, gravação e consulta de objetos no bucket; não precisa de
  permissão de criação de buckets. A aplicação não usa ACL pública.

## Publicação

1. Render → New → Blueprint → conectar `BzRTech/ArqProject` e selecionar a branch da entrega.
2. Confirmar plano Free e região. O banco é externo: não criar Render Postgres.
3. Preencher `DATABASE_URL` do Neon, `S3_BUCKET`, `S3_ENDPOINT_URL`, `S3_REGION`,
   `S3_ACCESS_KEY`, `S3_SECRET_KEY`. Definir `S3_KEY_PREFIX` com a pasta do bucket,
   inicialmente `prancheta/testes`, sem incluir o nome do bucket.
   Para R2: endpoint da API S3 `https://<account-id>.r2.cloudflarestorage.com` e região `auto`.
   Para AWS: endpoint regional S3 e região do bucket. Não usar o domínio público de arquivos.
4. Configurar CORS do bucket com a origem HTTPS exata do serviço Render. Exemplo S3 abaixo;
   o painel R2 usa a lista de regras sem o envelope `CORSRules`.
5. Aguardar build, migrations, seed e health check. O hostname `onrender.com` é reconhecido
   automaticamente. Para domínio próprio, definir também `DJANGO_ALLOWED_HOSTS` (hostname)
   e `DJANGO_CSRF_TRUSTED_ORIGINS` (origem HTTPS), separados por vírgulas quando houver vários.

```json
{
  "CORSRules": [{
    "AllowedOrigins": ["https://SEU-SERVICO.onrender.com"],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }]
}
```

Não definir `S3_PUBLIC_ENDPOINT_URL=same-origin` em produção: isso só funciona com o proxy
Vite local. Quando não definida, o navegador usa o endpoint S3 configurado, com URLs assinadas.

Exemplo de organização: `s3://SEU-BUCKET/prancheta/testes/orgs/<escritorio>/assets/<id>/<arquivo>`.
A pasta é um prefixo S3 e aparece no primeiro upload, sem precisar criá-la manualmente.
Credenciais podem ser limitadas a esse prefixo. Alterar o prefixo depois só afeta novos uploads;
arquivos anteriores continuam sendo acessados pela chave salva no banco e precisam manter
suas permissões. CORS é configurado no bucket, não na pasta. S3 tem cobrança própria conforme uso.

## Contas de teste

Cadastro começa fechado (`ALLOW_SIGNUP=false`); convites ainda não foram implementados.
Para cadastrar os participantes iniciais, abrir temporariamente (`true`), criar as contas
e seus escritórios pela interface e fechar novamente. Durante essa janela qualquer visitante
com acesso ao site consegue se cadastrar. Não divulgar o link até fechar o cadastro.
Contas existentes continuam entrando após o fechamento.

## Aceite antes de distribuir o link

- `/api/health/`: banco ok; HTTP redireciona para HTTPS fora do health check.
- Login, logout e recarregamento direto de `/projetos/<id>`.
- Importar imagem/PDF, salvar, sair e reabrir em outra sessão: arquivo deve vir do bucket.
- Abrir 3D, capturar perspectiva, salvar versão, modificar e restaurar.
- Exportar prancha e memorial; conferir fontes, imagens e medidas.
- Verificar isolamento entre dois escritórios; confirmar cadastro fechado para terceiros.
- Conferir política de backups do banco e recuperação dos objetos antes de usar dados reais.

O build de produção não expõe `window.__editor`; os testes E2E que criam fixtures por esse
objeto continuam sendo executados no ambiente de desenvolvimento. A publicação requer
smoke test pela interface e pelos endpoints reais.

Render Free hiberna após 15 minutos sem tráfego; o primeiro acesso pode levar cerca de um
minuto para despertar. Neon Free também pode suspender compute ocioso e possui limites próprios.
As verificações de conexão recuperam conexões antigas e cursores no servidor estão desativados
para compatibilidade com o endpoint pooled do Neon. Dados ficam no Neon/S3, não no disco do Render.
O limite de 30 dias do Render Postgres Free não se aplica a esta arquitetura, que não o utiliza.

Fontes: [Render Django](https://render.com/docs/deploy-django),
[Blueprint](https://render.com/docs/blueprint-spec), [limites gratuitos](https://render.com/docs/free),
[Neon e Django](https://neon.com/docs/guides/django).
