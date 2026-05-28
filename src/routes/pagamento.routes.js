import express from 'express';
import { createPreference, webhook, syncPayment } from '../controllers/pagamento.controller.js';

const router = express.Router();

// Cria preferência de pagamento (retorna URL para checkout MercadoPago)
router.post('/preference', createPreference);

// Webhook para notificações do MercadoPago
router.post('/webhook', express.json(), webhook);

// Sincronização manual/redirecionamento de pagamento
router.post('/sync', express.json(), syncPayment);

export default router;
