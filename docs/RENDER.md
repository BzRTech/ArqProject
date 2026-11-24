# Ambiente de testes no Render

O Blueprint `render.yaml` cria um serviço Docker (frontend compilado + Django/Gunicorn
no mesmo domínio) e PostgreSQL 16. O bucket S3/R2 deve existir previamente e ser privado.
Uploads não dependem do disco temporário do Render. Redis não é necessário no fluxo atual.

## Antes de publicar

- Revisar os custos exibidos pelo Render: o arquivo usa Web Starter e Postgres Basic 256 MB.
  Nenhum recurso é criado apenas por commitar o arquivo. Deploy automático está desligado.
- Usar bucket e banco próprios de homologação. Não copiar documentos de clientes sem necessidade.
- Fornecer as credenciais do bucket diretamente no painel de variáveis do Render, nunca no Git.
- S3/R2 deve permitir leitura, gravação e consulta de objetos no bucket; não precisa de
  permissão de criação de buckets. A aplicação não usa ACL pública.

## Publicação

1. Render → New → Blueprint → conectar `BzRTech/ArqProject` e selecionar a branch da entrega.
2. Revisar serviço, banco, região e preço antes de confirmar a criação.
3. Preencher `S3_BUCKET`, `S3_ENDPOINT_URL`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`.
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

O plano gratuito pode servir para demonstração temporária, mas o Postgres gratuito expira
após 30 dias e o serviço web pode hibernar. Por isso o Blueprint não usa esse plano por padrão.

Fontes: [Render Django](https://render.com/docs/deploy-django),
[Blueprint](https://render.com/docs/blueprint-spec), [limites gratuitos](https://render.com/docs/free).
