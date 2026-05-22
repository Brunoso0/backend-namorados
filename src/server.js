import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { inicializarCronBloqueios } from './config/cron.js';
import eventoRoutes from './routes/evento.routes.js';
import adminRoutes from './routes/admin.routes.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Correção para usar __dirname em ES Modules e servir a pasta estática
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Inicia o job de background (30 min)
inicializarCronBloqueios();

// Canal SSE para o Painel Administrativo receber notificações ao vivo
let clientesPainelAdmin = [];

app.get('/api/v1/admin/notificacoes-checkin', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  clientesPainelAdmin.push(res);

  req.on('close', () => {
    clientesPainelAdmin = clientesPainelAdmin.filter(cliente => cliente !== res);
  });
});

// Função exportada para a rota de check-in conseguir disparar o aviso
export const emitirCheckInParaOPainel = (dadosCasal) => {
  clientesPainelAdmin.forEach(cliente => {
    cliente.write(`data: ${JSON.stringify(dadosCasal)}\n\n`);
  });
};

// Acopla as rotas limpas no prefixo da API
app.use('/api/v1/evento', eventoRoutes);
app.use('/api/v1/admin', adminRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server rodando de forma limpa e estruturada na porta ${PORT}`);
});