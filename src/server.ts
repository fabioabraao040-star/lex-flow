import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@base44/sdk';

dotenv.config();

// ==========================================
// 1. SECRETS & PRODUCTION SECURITY VALIDATION
// ==========================================
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD;

if (process.env.NODE_ENV === 'production') {
  if (!ADMIN_PASSWORD || ADMIN_PASSWORD === 'lexflow2026' || ADMIN_PASSWORD.length < 8) {
    console.error('[FATAL SECURITY ERROR] ADMIN_PASSWORD must be configured with a strong password (minimum 8 characters) in production.');
    process.exit(1);
  }
  if (!ADMIN_SECRET || ADMIN_SECRET === 'lexflow_secure_server_secret_2026' || ADMIN_SECRET.length < 16) {
    console.error('[FATAL SECURITY ERROR] ADMIN_SECRET must be configured with a strong secret key in production.');
    process.exit(1);
  }
}

const resolvedPassword = ADMIN_PASSWORD || 'lexflow2026';
const resolvedSecret = ADMIN_SECRET || 'lexflow_secure_server_secret_2026';

const BASE44_APP_ID = process.env.BASE44_APP_ID || '6abd7343909c5bbba892bcc2';
const BASE44_ACCESS_TOKEN = process.env.BASE44_ACCESS_TOKEN;

const base44 = BASE44_ACCESS_TOKEN
  ? createClient({
      appId: BASE44_APP_ID,
      token: BASE44_ACCESS_TOKEN,
    })
  : null;

// ==========================================
// 2. CRYPTOGRAPHIC SIGNED TOKENS (HMAC-SHA256)
// ==========================================
function generateSignedToken(): string {
  const expiresAt = Date.now() + 8 * 60 * 60 * 1000; // 8 hours expiration
  const payload = JSON.stringify({ exp: expiresAt, salt: crypto.randomBytes(16).toString('hex') });
  const signature = crypto.createHmac('sha256', resolvedSecret).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ p: payload, s: signature })).toString('base64');
}

function verifySignedToken(token: string): boolean {
  try {
    if (!token || typeof token !== 'string' || token.length > 2048) return false;
    const decodedJson = Buffer.from(token, 'base64').toString('utf-8');
    const parsed = JSON.parse(decodedJson);
    if (!parsed || typeof parsed.p !== 'string' || typeof parsed.s !== 'string') return false;

    const { p, s } = parsed;
    const expectedSig = crypto.createHmac('sha256', resolvedSecret).update(p).digest('hex');

    const sigBuf = Buffer.from(s, 'hex');
    const expectedBuf = Buffer.from(expectedSig, 'hex');
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return false;
    }

    const payloadData = JSON.parse(p);
    if (!payloadData || typeof payloadData.exp !== 'number' || payloadData.exp < Date.now()) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// ==========================================
// 4. BRUTE-FORCE PROTECTION (Instance-Level)
// ==========================================
const loginAttempts = new Map<string, { count: number; lockUntil: number }>();

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 3000);

  app.use(
    cors({
      origin: [
        'https://lex-flow-dashboard.vercel.app',
        'https://lex-flow-elite.base44.app',
        'https://preview--lex-flow-elite.base44.app',
        'http://localhost:3000',
        'http://localhost:5173',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );

  app.use(express.json());

  // ==========================================
  // 5. ROUTE PROTECTION MIDDLEWARE
  // ==========================================
  const requireAdminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : req.body?.token || req.query?.token;

    if (token && verifySignedToken(token)) {
      return next();
    }

    return res.status(401).json({
      status: 'error',
      message: 'Acesso não autorizado. Sessão inválida ou expirada.',
    });
  };

  // Admin Authentication Endpoints
  app.post('/api/auth/login', (req, res) => {
    const clientIp = String(req.ip || req.headers['x-forwarded-for'] || 'unknown_ip');
    const now = Date.now();
    const record = loginAttempts.get(clientIp);

    if (record && record.lockUntil > now) {
      const remainingSeconds = Math.ceil((record.lockUntil - now) / 1000);
      return res.status(429).json({
        status: 'error',
        message: `Muitas tentativas incorretas. Acesso bloqueado por ${remainingSeconds} segundos.`,
      });
    }

    const { password } = req.body;

    const passwordMatch =
      typeof password === 'string' &&
      password.length === resolvedPassword.length &&
      crypto.timingSafeEqual(Buffer.from(password), Buffer.from(resolvedPassword));

    if (!passwordMatch) {
      const failedCount = record ? record.count + 1 : 1;
      let lockUntil = 0;
      if (failedCount >= 5) {
        lockUntil = now + 15 * 60 * 1000;
      }
      loginAttempts.set(clientIp, { count: failedCount, lockUntil });

      return res.status(401).json({
        status: 'error',
        message: 'Credenciais inválidas. Verifique a senha administrativa.',
      });
    }

    loginAttempts.delete(clientIp);
    const token = generateSignedToken();

    return res.status(200).json({
      status: 'ok',
      token,
      message: 'Autenticação realizada com sucesso.',
    });
  });

  app.post('/api/auth/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : req.body?.token;

    if (token && verifySignedToken(token)) {
      return res.status(200).json({ authenticated: true });
    }

    return res.status(401).json({ authenticated: false });
  });

  app.post('/api/auth/logout', (_req, res) => {
    return res.status(200).json({ status: 'ok', message: 'Sessão encerrada com sucesso.' });
  });

  // Public API status routes
  app.get('/api', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      name: 'Lex Flow Pro Monitor API',
      version: '2.0.0',
      message: 'Lex Flow API está online e segura.',
    });
  });

  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      name: 'Lex Flow Pro Monitor API',
      version: '2.0.0',
    });
  });

  // Protected Monitoring Status Route (Honest status evaluation without Efi Pix)
  app.get('/api/monitoring/status', requireAdminAuth, async (req, res) => {
    const isTestExecution = req.query.test === 'true';
    const startTime = Date.now();
    const serviceList = [
      { id: 'vercel-backend', name: 'API / Backend na Vercel', category: 'Vercel / Produção' },
      { id: 'base44-backend', name: 'Backend Base44', category: 'Base44' },
      { id: 'whatsapp-meta', name: 'WhatsApp Cloud API (Meta)', category: 'WhatsApp' },
      { id: 'ai-provider', name: 'Provedor de IA (LLM)', category: 'Inteligência Artificial' },
    ];

    const services: any[] = [];

    if (!isTestExecution) {
      for (const s of serviceList) {
        services.push({
          id: s.id,
          name: s.name,
          category: s.category,
          status: 'gray',
          httpCode: 0,
          responseTime: 0,
          lastChecked: null,
          description: 'Serviço não testado — clique em "Testar Todas as Conexões" para iniciar a auditoria.',
          guidance: 'Aguardando execução do teste real.',
          history: [],
        });
      }

      return res.status(200).json({
        status: 'ok',
        summary: {
          total: services.length,
          active: 0,
          errors: 0,
          pending: services.length,
          lastChecked: null,
          durationMs: 0,
        },
        services,
      });
    }

    // Live Test Execution
    // 1. API / Backend na Vercel
    const vercelTargetUrl = process.env.VERCEL_API_URL || 'https://lex-flow-steel.vercel.app';
    let vercelStatus = 'gray';
    let vercelHttpCode = 0;
    let vercelLatency = 0;
    let vercelDesc = 'AINDA NÃO CONFIGURADO — aguardando credenciais e validação.';
    let vercelGuidance = 'Defina a URL da API da Vercel no ambiente para iniciar o monitoramento.';

    if (vercelTargetUrl) {
      const vStart = Date.now();
      try {
        const vRes = await fetch(vercelTargetUrl, { method: 'GET', signal: AbortSignal.timeout(5000) });
        vercelLatency = Date.now() - vStart;
        vercelHttpCode = vRes.status;
        if (vRes.ok) {
          vercelStatus = 'green';
          vercelDesc = 'API Vercel respondendo com sucesso (HTTP 200 OK).';
          vercelGuidance = 'Operação normal.';
        } else {
          vercelStatus = 'red';
          vercelDesc = `Falha HTTP ${vRes.status} recebida da Vercel.`;
          vercelGuidance = 'Verifique os logs de deploy e rotas na Vercel.';
        }
      } catch (err: any) {
        vercelLatency = Date.now() - vStart;
        vercelStatus = 'red';
        vercelHttpCode = 502;
        vercelDesc = `Erro de conexão: ${err.message || 'Timeout'}`;
        vercelGuidance = 'Verifique a conectividade de rede e DNS da Vercel.';
      }
    }

    services.push({
      id: 'vercel-backend',
      name: 'API / Backend na Vercel',
      category: 'Vercel / Produção',
      status: vercelStatus,
      httpCode: vercelHttpCode,
      responseTime: vercelLatency,
      lastChecked: new Date().toISOString(),
      description: vercelDesc,
      guidance: vercelGuidance,
      history: [
        { timestamp: new Date().toISOString(), status: vercelStatus, httpCode: vercelHttpCode, responseTime: vercelLatency }
      ],
    });

    // 2. Backend Base44
    let base44Status = 'gray';
    let base44HttpCode = 0;
    let base44Latency = 0;
    let base44Desc = 'AINDA NÃO CONFIGURADO — aguardando credenciais e validação.';
    let base44Guidance = 'Configure BASE44_ACCESS_TOKEN para habilitar a conexão com o Base44.';

    if (!base44) {
      base44Status = 'yellow';
      base44Desc = 'Configuração incompleta: BASE44_ACCESS_TOKEN ausente.';
      base44Guidance = 'Insira a chave de acesso do Base44 nas variáveis de ambiente.';
    } else {
      const bStart = Date.now();
      try {
        await base44.entities.Cliente.list();
        base44Latency = Date.now() - bStart;
        base44Status = 'green';
        base44HttpCode = 200;
        base44Desc = 'Conexão e listagem de entidades Base44 validadas com sucesso.';
        base44Guidance = 'Operação normal.';
      } catch (err: any) {
        base44Latency = Date.now() - bStart;
        base44Status = 'red';
        base44HttpCode = 502;
        base44Desc = `Falha na API Base44: ${err.message || 'Erro de autenticação'}`;
        base44Guidance = 'Verifique se o token de acesso do Base44 é válido e possui permissões.';
      }
    }

    services.push({
      id: 'base44-backend',
      name: 'Backend Base44',
      category: 'Base44',
      status: base44Status,
      httpCode: base44HttpCode,
      responseTime: base44Latency,
      lastChecked: new Date().toISOString(),
      description: base44Desc,
      guidance: base44Guidance,
      history: [
        { timestamp: new Date().toISOString(), status: base44Status, httpCode: base44HttpCode, responseTime: base44Latency }
      ],
    });

    // 3. WhatsApp Cloud API (Meta)
    const metaToken = process.env.META_ACCESS_TOKEN;
    const metaPhoneId = process.env.META_PHONE_NUMBER_ID;
    let waStatus = 'gray';
    let waHttpCode = 0;
    let waLatency = 0;
    let waDesc = 'AINDA NÃO CONFIGURADO — aguardando credenciais e validação.';
    let waGuidance = 'Configure META_ACCESS_TOKEN e META_PHONE_NUMBER_ID para conectar ao WhatsApp.';

    if (!metaToken || !metaPhoneId) {
      waStatus = 'yellow';
      waDesc = 'Configuração incompleta: Tokens da Meta ausentes no ambiente.';
      waGuidance = 'Adicione META_ACCESS_TOKEN e META_PHONE_NUMBER_ID.';
    } else {
      const wStart = Date.now();
      try {
        const wRes = await fetch(`https://graph.facebook.com/v26.0/${metaPhoneId}`, {
          headers: { Authorization: `Bearer ${metaToken}` },
          signal: AbortSignal.timeout(5000),
        });
        waLatency = Date.now() - wStart;
        waHttpCode = wRes.status;
        if (wRes.ok) {
          waStatus = 'green';
          waDesc = 'Conexão com a Graph API da Meta validada com sucesso.';
          waGuidance = 'Pronto para recebimento e envio de mensagens.';
        } else {
          waStatus = 'red';
          const wJson = await wRes.json().catch(() => ({}));
          waDesc = `Erro Meta API: ${wJson?.error?.message || `HTTP ${wRes.status}`}`;
          waGuidance = 'Verifique a validade do token de acesso da Meta.';
        }
      } catch (err: any) {
        waLatency = Date.now() - wStart;
        waStatus = 'red';
        waHttpCode = 408;
        waDesc = `Timeout ou falha de rede ao contatar Meta: ${err.message}`;
        waGuidance = 'Verifique a conectividade com os servidores da Meta.';
      }
    }

    services.push({
      id: 'whatsapp-meta',
      name: 'WhatsApp Cloud API (Meta)',
      category: 'WhatsApp',
      status: waStatus,
      httpCode: waHttpCode,
      responseTime: waLatency,
      lastChecked: new Date().toISOString(),
      description: waDesc,
      guidance: waGuidance,
      history: [
        { timestamp: new Date().toISOString(), status: waStatus, httpCode: waHttpCode, responseTime: waLatency }
      ],
    });

    // 4. Provedor de IA
    const aiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    let aiStatus = 'gray';
    let aiDesc = 'AINDA NÃO CONFIGURADO — aguardando credenciais e validação.';
    let aiGuidance = 'Configure GEMINI_API_KEY para habilitar recursos inteligentes.';

    if (aiKey) {
      aiStatus = 'yellow';
      aiDesc = 'Credencial de IA detectada no ambiente — aguardando teste real de inferência.';
      aiGuidance = 'A chave foi detectada, mas requer validação em tempo de execução para atestar operação plena.';
    }

    services.push({
      id: 'ai-provider',
      name: 'Provedor de IA (LLM)',
      category: 'Inteligência Artificial',
      status: aiStatus,
      httpCode: aiStatus === 'yellow' ? 200 : 0,
      responseTime: 0,
      lastChecked: new Date().toISOString(),
      description: aiDesc,
      guidance: aiGuidance,
      history: [
        { timestamp: new Date().toISOString(), status: aiStatus, httpCode: 0, responseTime: 0 }
      ],
    });

    const totalDuration = Date.now() - startTime;
    const activeCount = services.filter(s => s.status === 'green').length;
    const errorCount = services.filter(s => s.status === 'red' || s.status === 'timeout').length;
    const pendingCount = services.filter(s => s.status === 'yellow' || s.status === 'gray').length;

    return res.status(200).json({
      status: 'ok',
      summary: {
        total: services.length,
        active: activeCount,
        errors: errorCount,
        pending: pendingCount,
        lastChecked: new Date().toISOString(),
        durationMs: totalDuration,
      },
      services,
    });
  });

  // WhatsApp test endpoint (protected)
  app.post('/api/whatsapp/test', requireAdminAuth, async (_req, res) => {
    const accessToken = process.env.META_ACCESS_TOKEN;
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
    const recipient = process.env.META_TEST_TO;

    if (!accessToken || !phoneNumberId || !recipient) {
      return res.status(503).json({
        status: 'error',
        whatsapp: 'not_configured',
        message: 'AINDA NÃO CONFIGURADO — aguardando credenciais e validação.',
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
              language: { code: 'en_US' },
            },
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          status: 'error',
          whatsapp: 'send_failed',
          error: data?.error?.message ?? 'Meta API retornou um erro.',
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

  // Mount Vite middleware for SPA frontend
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.listen(port, '0.0.0.0', () => {
    console.log(`Lex Flow Pro Monitor running on http://localhost:${port}`);
  });
}

startServer();
