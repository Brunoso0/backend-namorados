import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { inicializarCronBloqueios } from './config/cron.js';
import { adicionarClientePainel } from './config/sse.js';
import eventoRoutes from './routes/evento.routes.js';
import adminRoutes from './routes/admin.routes.js';
import cardapioRoutes from './routes/cardapio.routes.js';
import pagamentoRoutes from './routes/pagamento.routes.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const corsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    try {
      const u = new URL(origin);
      const hostname = u.hostname;
      const port = u.port;

      // allow localhost:3000 and 127.0.0.1:3000
      if ((hostname === 'localhost' || hostname === '127.0.0.1') && port === '3000') return callback(null, true);

      // allow jrcoffee.com.br and any subdomain (https or http)
      if (hostname === 'jrcoffee.com.br' || hostname.endsWith('.jrcoffee.com.br')) return callback(null, true);

      return callback(new Error('Not allowed by CORS'));
    } catch (e) {
      return callback(new Error('Invalid origin'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

// Correção para usar __dirname em ES Modules e servir a pasta estática
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// Rotas de cardápio (admin CRUD)
app.use('/api/v1/admin', cardapioRoutes);

// Inicia o job de background (30 min)
inicializarCronBloqueios();

app.get('/api/v1/admin/notificacoes-checkin', (req, res) => {
  const removerCliente = adicionarClientePainel(res);
  req.on('close', removerCliente);
});

// Acopla as rotas limpas no prefixo da API
app.use('/api/v1/evento', eventoRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/pagamento', pagamentoRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server rodando de forma limpa e estruturada na porta ${PORT}`);
});