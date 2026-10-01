import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({
    status: "ok",
    name: "Lex Flow API",
    version: "1.0.0",
    message: "Lex Flow API está online."
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: "ok",
    name: "Lex Flow API",
    version: "1.0.0"
  });
});

if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  app.listen(Number(port), () => {
    console.log(`Lex Flow API running on port ${port}`);
  });
}

export default app;
