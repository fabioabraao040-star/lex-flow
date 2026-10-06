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
  'https://lex-flow-elite.base44.app',
      'https://preview--lex-flow-elite.base44.app',
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
    version: '1.1.1',
    message: 'Lex Flow API está online.',
  });
});

app.get('/api', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    name: 'Lex Flow API',
    version: '1.1.1',
    message: 'Lex Flow API está online.',
  });
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    name: 'Lex Flow API',
    version: '1.1.1',
  });
});

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


app.post('/api/whatsapp/send', async (req, res) => {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;

  const to = normalizePhone(req.body?.to);
  const message = String(req.body?.message ?? '').trim();

  if (!accessToken || !phoneNumberId) {
    return res.status(503).json({
      status: 'error',
      whatsapp: 'not_configured',
    });
  }

  if (!to) {
    return res.status(400).json({
      status: 'error',
      message: 'Número do destinatário não informado.',
    });
  }

  if (!message) {
    return res.status(400).json({
      status: 'error',
      message: 'Mensagem não informada.',
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
          recipient_type: 'individual',
          to,
          type: 'text',
          text: {
            preview_url: false,
            body: message,
          },
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        'Erro Meta ao enviar WhatsApp:',
        JSON.stringify(data),
      );

      return res.status(response.status).json({
        status: 'error',
        whatsapp: 'send_failed',
        error:
          data?.error?.message ??
          'Meta API retornou um erro.',
      });
    }

    return res.status(200).json({
      status: 'ok',
      whatsapp: 'message_sent',
      message_id: data?.messages?.[0]?.id ?? null,
      to,
    });
  } catch (error) {
    console.error(
      'Erro de conexão com Meta:',
      error,
    );

    return res.status(502).json({
      status: 'error',
      whatsapp: 'request_failed',
    });
  }
});

const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

app.get('/api/webhooks/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (
    mode === 'subscribe' &&
    META_VERIFY_TOKEN &&
    token === META_VERIFY_TOKEN
  ) {
    return res.status(200).send(challenge);
  }

  return res.status(403).send('Forbidden');
});

function normalizePhone(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

function getTextMessage(message: any): string {
  return String(message?.text?.body ?? '').trim();
}

async function processIncomingWhatsAppMessage(
  message: any,
  contact: any,
) {
  if (!base44) {
    throw new Error('Base44 não configurado.');
  }

  const content = getTextMessage(message);

  if (!content) {
    return {
      processed: false,
      reason: 'message_without_text',
    };
  }

  const phone = normalizePhone(message?.from);

  if (!phone) {
    throw new Error('Telefone do remetente não informado.');
  }

  const metaMessageId = String(message?.id ?? '').trim();

  if (!metaMessageId) {
    throw new Error('ID da mensagem Meta não informado.');
  }

  const clientName =
    String(contact?.profile?.name ?? '').trim() ||
    `WhatsApp ${phone}`;

  const now = new Date().toISOString();
  const duplicateMarker = `[meta_message_id:${metaMessageId}]`;

  const attendancesResult =
    await base44.entities.Atendimento.list();

  const attendances = Array.isArray(attendancesResult) ? attendancesResult : [];

  const duplicateAttendance = attendances.find(
    (item: any) =>
      typeof item.historico === 'string' &&
      item.historico.includes(duplicateMarker),
  );

  if (duplicateAttendance) {
    return {
      processed: true,
      duplicate: true,
      cliente_id: null,
      atendimento_id: duplicateAttendance.id,
      mensagem_id: null,
      telefone: phone,
    };
  }

  const clientsResult = await base44.entities.Cliente.list();
  const clients = Array.isArray(clientsResult) ? clientsResult : [];

  let client = clients.find(
    (item: any) => normalizePhone(item.telefone) === phone,
  );

  if (!client) {
    client = await base44.entities.Cliente.create({
      nome: clientName,
      telefone: phone,
      email: '',
      observacoes: 'Cliente criado automaticamente pelo WhatsApp.',
    });
  }

  if (!client) {
    throw new Error('Não foi possível obter ou criar o cliente.');
  }

  const attendantsResult = await base44.entities.Atendente.list();
  const attendants = Array.isArray(attendantsResult) ? attendantsResult : [];

  const onlineAttendant =
    attendants.find((item: any) => item.status === 'online') ??
    attendants[0] ??
    null;

  let atendimento = attendances.find(
    (item: any) =>
      normalizePhone(item.cliente_telefone) === phone &&
      item.status !== 'finalizada',
  );

  if (!atendimento) {
    atendimento = await base44.entities.Atendimento.create({
      cliente_nome: client.nome || clientName,
      cliente_telefone: phone,
      cliente_email: client.email || '',
      canal: 'whatsapp',
      atendente_nome: onlineAttendant?.nome || '',
      status: 'recebida',
      prioridade: 'media',
      assunto: 'Atendimento via WhatsApp',
      horario: now,
      historico: `${duplicateMarker}\n[${now}] Cliente: ${content}`,
      ultima_mensagem: content,
      nao_lidas: 1,
      tempo_primeira_resposta: 0,
      resumo: content,
      proxima_acao: 'Aguardar atendimento.',
      aguardando_resposta: true,
    });
  } else {
    const historicoAnterior = atendimento.historico || '';

    const historicoAtual = historicoAnterior
      ? `${historicoAnterior}\n${duplicateMarker}\n[${now}] Cliente: ${content}`
      : `${duplicateMarker}\n[${now}] Cliente: ${content}`;

    atendimento = await base44.entities.Atendimento.update(
      atendimento.id,
      {
        cliente_nome: client.nome || clientName,
        cliente_telefone: phone,
        cliente_email: client.email || '',
        canal: 'whatsapp',
        atendente_nome:
          atendimento.atendente_nome ||
          onlineAttendant?.nome ||
          '',
        status: atendimento.status || 'recebida',
        horario: atendimento.horario || now,
        historico: historicoAtual,
        ultima_mensagem: content,
        nao_lidas: Number(atendimento.nao_lidas || 0) + 1,
        resumo: content,
        proxima_acao: 'Aguardar atendimento.',
        aguardando_resposta: true,
      },
    );
  }

  const atendimentoFinal = atendimento;

  if (!atendimentoFinal) {
    throw new Error('Atendimento não disponível após processamento.');
  }

  const mensagem = await base44.entities.Mensagem.create({
    atendimento_id: atendimentoFinal.id,
    remetente: 'cliente',
    conteudo: content,
    horario: now,
    lida: false,
  });

  return {
    processed: true,
    duplicate: false,
    cliente_id: client.id,
    atendimento_id: atendimentoFinal.id,
    mensagem_id: mensagem.id,
    telefone: phone,
  };
}

app.post('/api/webhooks/whatsapp', async (req, res) => {
  try {
    const body = req.body;

    console.log(
      'WhatsApp webhook recebido:',
      JSON.stringify(body),
    );

    if (body?.object !== 'whatsapp_business_account') {
      return res.status(200).json({
        status: 'ok',
        received: true,
        processed: false,
        reason: 'unsupported_object',
      });
    }

    const results: any[] = [];

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'messages') {
          continue;
        }

        const value = change.value;

        for (const message of value?.messages ?? []) {
          const contact =
            (value?.contacts ?? []).find(
              (item: any) =>
                normalizePhone(item.wa_id) ===
                normalizePhone(message.from),
            ) ?? value?.contacts?.[0];

          try {
            const result =
              await processIncomingWhatsAppMessage(
                message,
                contact,
              );

            results.push({
              message_id: message.id ?? null,
              ...result,
            });
          } catch (error) {
            console.error(
              'Erro ao processar mensagem WhatsApp:',
              error,
            );

            results.push({
              message_id: message.id ?? null,
              processed: false,
              reason: 'processing_error',
            });
          }
        }
      }
    }

    return res.status(200).json({
      status: 'ok',
      received: true,
      processed: results,
    });
  } catch (error) {
    console.error('Erro geral no webhook:', error);

    return res.status(500).json({
      status: 'error',
    });
  }
});

if (
  process.env.NODE_ENV !== 'production' ||
  process.env.VERCEL !== '1'
) {
  app.listen(port, () => {
    console.log(`Lex Flow API running on port ${port}`);
  });
}

export default app;
