import express from 'express';
import { createPreference, webhook } from '../controllers/pagamento.controller.js';

const router = express.Router();

// Cria preferência de pagamento (retorna URL para checkout MercadoPago)
router.post('/preference', createPreference);

// Webhook para notificações do MercadoPago
router.post('/webhook', express.json(), webhook);

export default router;
