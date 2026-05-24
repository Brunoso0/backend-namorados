import { Router } from 'express';
import { CardapioController } from '../controllers/cardapio.controller.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';

const router = Router();
const controller = new CardapioController();

// Rotas de CRUD para pratos do cardápio (admin)
router.post('/cardapio', requireAdmin, (req, res) => controller.criarPrato(req, res));
router.put('/cardapio/:id', requireAdmin, (req, res) => controller.editarPrato(req, res));
router.delete('/cardapio/:id', requireAdmin, (req, res) => controller.deletarPrato(req, res));

export default router;
