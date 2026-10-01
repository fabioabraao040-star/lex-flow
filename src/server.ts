import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);

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

if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  app.listen(port, () => {
    console.log(`Lex Flow API running on port ${port}`);
  });
}

export default app;
