import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@base44/sdk';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);

const BASE44_APP_ID = '6abd7343909c5bbba892bcc2';
const BASE44_ACCESS_TOKEN = process.env.BASE44_ACCESS_TOKEN;

const base44 = BASE44_ACCESS_TOKEN
  ? createClient({
      appId: BASE44_APP_ID,
      token: BASE44_ACCESS_TOKEN,
    })
  : null;

app.use(
  cors({
    origin: [
      'https://lex-flow-dashboard.vercel.app',
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);

app.use(express.json());

app.get('/', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    name: 'Lex Flow API',
    version: '1.0.0',
    message: 'Lex Flow API está online.',
  });
});

app.get('/api', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    name: 'Lex Flow API',
    version: '1.0.0',
    message: 'Lex Flow API está online.',
  });
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    name: 'Lex Flow API',
    version: '1.0.0',
  });
});

/**
 * Teste seguro da comunicação com o Base44.
 * Não retorna o token nem os dados dos clientes.
 */
app.get('/api/base44/health', async (_req, res) => {
  if (!base44) {
    return res.status(503).json({
      status: 'error',
      base44: 'not_configured',
    });
  }

  try {
    await base44.entities.Cliente.list();

    return res.status(200).json({
      status: 'ok',
      base44: 'connected',
      appId: BASE44_APP_ID,
    });
  } catch (_error) {
    return res.status(502).json({
      status: 'error',
      base44: 'connection_failed',
    });
  }
});


app.post('/api/whatsapp/test', async (_req, res) => {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  const recipient = process.env.META_TEST_TO;

  if (!accessToken || !phoneNumberId || !recipient) {
    return res.status(503).json({
      status: 'error',
      whatsapp: 'not_configured',
    });
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v26.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: recipient,
          type: 'template',
          template: {
            name: 'hello_world',
            language: {
              code: 'en_US',
            },
          },
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        status: 'error',
        whatsapp: 'send_failed',
        error: data?.error?.message ?? 'Meta API returned an error.',
      });
    }

    return res.status(200).json({
      status: 'ok',
      whatsapp: 'message_sent',
      message_id: data?.messages?.[0]?.id ?? null,
    });
  } catch (_error) {
    return res.status(502).json({
      status: 'error',
      whatsapp: 'request_failed',
    });
  }
});

if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  app.listen(port, () => {
    console.log(`Lex Flow API running on port ${port}`);
  });
}

export default app;
