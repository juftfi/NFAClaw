import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { config } from './services/config';
import { chatRouter } from './routes/chat';
import { agentRouter } from './routes/agent';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.allowedOrigin
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

app.use(
  '/api/chat',
  rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    max: 80,
    standardHeaders: true,
    legacyHeaders: false
  }),
  chatRouter
);

app.use('/api/agent', agentRouter);

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'flap-nfa-agent-server'
  });
});

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Agent server running on http://localhost:${config.port}`);
});
