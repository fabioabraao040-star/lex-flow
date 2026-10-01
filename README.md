# Lex Flow Backend

API REST desenvolvida em Node.js com TypeScript e Express para o sistema Lex Flow, preparada para produção, versionamento no GitHub e deploy na Vercel.

## Requisitos

- Node.js (v18 ou superior)
- npm

## Instalação

Instale as dependências do projeto:

```bash
npm install
```

## Configuração do Ambiente (.env)

O projeto utiliza variáveis de ambiente para configuração. Um arquivo de exemplo (`.env.example`) está incluído na raiz.

Para configurar o seu ambiente local:

1. Copie o arquivo `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```
2. Defina a porta desejada no arquivo `.env` (padrão: `3000`):
   ```env
   PORT=3000
   ```

## Execução

Para iniciar o servidor em ambiente de desenvolvimento/execução local:

```bash
npm start
```

Para compilar o projeto TypeScript para produção:

```bash
npm run build
```

## Endpoints da API

### Raiz da API
- **Rota**: `GET /`
- **Descrição**: Rota inicial da API.
- **Resposta esperada (HTTP 200)**:
  ```json
  {
    "status": "ok",
    "name": "Lex Flow API",
    "version": "1.0.0",
    "message": "Lex Flow API está online."
  }
  ```

### Verificação de Saúde (Health Check)
- **Rota**: `GET /api/health`
- **Descrição**: Retorna o status de funcionamento da API.
- **Resposta esperada (HTTP 200)**:
  ```json
  {
    "status": "ok",
    "name": "Lex Flow API",
    "version": "1.0.0"
  }
  ```

## Deploy na Vercel

O projeto está configurado com o arquivo `vercel.json` e exporta a instância do Express, estando pronto para deploy direto na plataforma Vercel.
