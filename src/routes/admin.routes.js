import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';

const router = Router();
const controller = new AdminController();

router.post('/register', (req, res) => controller.register(req, res));
router.post('/create', requireAdmin, (req, res) => controller.create(req, res));
router.post('/login', (req, res) => controller.login(req, res));
router.get('/me', requireAdmin, (req, res) => controller.me(req, res));

// Rotas de reservas e mesas para o painel de admin
router.get('/reservas', requireAdmin, (req, res) => controller.listarReservas(req, res));
router.get('/reservas/buscar', requireAdmin, (req, res) => controller.buscarReservas(req, res));
router.put('/reservas/:id/valor', requireAdmin, (req, res) => controller.atualizarValorReserva(req, res));
router.get('/mesas', requireAdmin, (req, res) => controller.listarMesasAdmin(req, res));
router.get('/mesas/:id/detalhes', requireAdmin, (req, res) => controller.obterDetalhesMesa(req, res));
router.post('/mesas/:id/status', requireAdmin, (req, res) => controller.atualizarStatusMesa(req, res));

export default router;
