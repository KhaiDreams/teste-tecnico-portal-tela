# Portal Tela - Desafio Tecnico Fullstack

Pipeline ponta a ponta para gerar conteudo com IA e publicar no WordPress, com execucao completa via Docker.

## 1) Arquitetura da solucao

Componentes:

- `backend/` (Node.js + TypeScript): recebe URL publica, extrai conteudo, gera artigo com IA, salva no Postgres e publica no WordPress via webhook.
- `wordpress-plugin/content-generator/`: plugin com endpoints REST customizados para receber payload e criar post.
- `wordpress-theme/portal-tela-theme/`: tema com Bootstrap + SASS + build de assets via Vite.

Bancos no Docker:

- `postgres`: usado pelo backend.
- `mysql`: usado pelo WordPress.

## 2) Decisao de autenticacao (importante para avaliacao)

As rotas abaixo estao **publicas**:

- `GET /api/posts`
- `GET /api/posts/:id`

Motivo (escopo de teste tecnico):

- o objetivo principal do desafio e validar o pipeline de geracao/publicacao;
- deixar leitura publica reduz atrito para o avaliador testar rapidamente no Postman;
- autenticacao para leitura foi tratada como evolucao em producao

O que ja esta pronto no codigo:

- middleware JWT implementado em `backend/src/middleware/authMiddleware.ts`;
- testes unitarios cobrindo geracao e validacao de token;
- configuracao por variaveis (`JWT_SECRET`, `JWT_EXPIRES_IN`) pronta para endurecer acesso.

Como ativar depois (1 passo):

- adicionar `authMiddleware` nas rotas que devem ser privadas em `backend/src/app.ts`.

Resumo da decisao:

- neste teste tecnico, as rotas foram mantidas publicas de forma intencional para facilitar validacao funcional;
- a base de autenticacao interna por token ja foi implementada para demonstrar prontidao de producao, sem aumentar friccao de teste.

## 3) Seguranca e escalabilidade
Seguranca implementada:

- validacao de entrada no endpoint principal;
- sanitizacao de conteudo gerado;
- rate limit global + endpoint sensivel de geracao;
- validacao de segredo no webhook WordPress;
- protecao SSRF basica (bloqueio de hosts internos/reservados);
- headers de seguranca com Helmet;
- CORS controlado por variavel de ambiente.

Escalabilidade atual:

- backend stateless (facil escalar horizontalmente);
- persistencia separada em banco;
- throttling para proteger recurso de IA e API.

Evolucao natural para producao:

- fila assincrona (worker) para desacoplar geracao/publicacao;
- retries idempotentes;
- observabilidade (metrics/tracing/alertas).

## 4) Pre-requisitos

- Docker Desktop com Docker Compose
- portas `3000` e `8080` livres

## 5) Configuracao de ambiente

O backend carrega variaveis de `backend/.env`.

Passos:

1. Copiar `backend/.env.example` para `backend/.env`.
2. Ajustar no minimo:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` (ex.: `gpt-4o-mini`)
   - `WORDPRESS_WEBHOOK_SECRET`
   - `JWT_SECRET`

## 6) Subir o projeto com Docker

```bash
docker compose up --build -d
```

Ver status:

```bash
docker compose ps
```

Ver logs:

```bash
docker compose logs -f backend wordpress mysql postgres theme-builder
```

Observacao: `theme-builder` pode aparecer como `exited (0)` porque e um container one-shot de build.

## 7) Primeira configuracao do WordPress

1. Abrir `http://localhost:8080`.
2. Finalizar instalacao inicial.
3. Ativar plugin `Content Generator`.
4. Ativar tema `Portal Tela`.

## 8) Rotas para teste

Backend:

- `GET http://localhost:3000/`
- `GET http://localhost:3000/api/health`
- `GET http://localhost:3000/api/health/detailed`
- `POST http://localhost:3000/api/generate-post`
- `GET http://localhost:3000/api/posts`
- `GET http://localhost:3000/api/posts/:id`

WordPress plugin:

- `GET http://localhost:8080/index.php?rest_route=/content-generator/v1/health`
- `POST http://localhost:8080/index.php?rest_route=/content-generator/v1/receive-post`

## 9) Fluxo end-to-end (teste principal)

Exemplo para gerar post pelo backend:

```bash
curl -X POST "http://localhost:3000/api/generate-post" ^
  -H "Content-Type: application/json" ^
  -d "{\"url\":\"https://www.tabnews.com.br/luangregati/capivara-criada-por-ia-faz-prefeitura-tapar-buraco-em-cidade-de-minas-gerais\"}"
```

Fluxo esperado:

1. backend consome URL;
2. IA gera `title`, `content`, `excerpt`;
3. backend salva no Postgres;
4. backend envia webhook para plugin;
5. plugin cria post no WordPress;
6. post aparece na home e no admin (`/wp-admin/edit.php`).

## 10) Documentacao da API (Postman)

Collection completa:

- `docs/postman/content-generator-service.postman_collection.json`

Ela cobre todas as rotas do backend e os endpoints do plugin WordPress para teste integrado.

## 11) Testes implementados

O backend possui uma camada de testes para garantir funcionamento basico e regressao controlada.

Tipos de testes desenvolvidos:

- Unitarios (`backend/src/tests/unit/authMiddleware.test.ts`)
  - validacao de geracao de token JWT;
  - validacao de expiracao customizada;
  - cenarios de middleware: sem header, header invalido, token valido e token expirado.
  - observacao: estes testes existem para comprovar que a protecao por token interno esta pronta para uso, mesmo com endpoints publicos no escopo deste desafio.

- E2E de API (`backend/src/tests/e2e/api.test.ts`)
  - `GET /api/health` retorna status esperado;
  - `GET /` retorna metadados da API;
  - `POST /api/generate-post` valida URL invalida e payload ausente;
  - tratamento de `404` para rota inexistente.

- Validacao rapida de ambiente (`backend/src/tests/quick-validation.ts`)
  - checagem de variaveis obrigatorias;
  - geracao de JWT;
  - validacao de configuracao geral e OpenAI.

Configuracao de testes:

- `backend/jest.config.cjs`: configuracao Jest para ESM + TypeScript (`ts-jest`).
- `backend/src/tests/setup.ts`: carrega `.env.test` antes da execucao dos testes.
- `backend/.env.test`: variaveis de ambiente para ambiente de teste.

Como rodar localmente:

```bash
cd backend
npm install
npm run build
npm test
npm run validate
```

Como rodar via Docker:

```bash
docker compose run --rm --build backend npm run build
docker compose run --rm --build backend npm test -- --runInBand
```

## 12) Entregaveis do desafio

Status no projeto:

- servico independente com endpoint principal: OK
- processamento de URL + IA + payload JSON: OK
- webhook para WordPress: OK
- plugin REST com criacao de post: OK
- tema com Bootstrap + build de assets: OK
- foco visual em `single.php`: OK
- README detalhado: OK
- colecao Postman: OK
