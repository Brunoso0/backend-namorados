import { Router } from 'express';
import { EventoController } from '../controllers/evento.controller.js';
import { validateSchema } from '../middlewares/validate.middleware.js';
import { uploadMiddleware } from '../middlewares/upload.middleware.js';
import { reservaSchema } from '../schemas/reserva.schema.js';

const router = Router();
const controller = new EventoController();

router.get('/cardapio', (req, res) => controller.listarCardapio(req, res));
router.get('/mesas', (req, res) => controller.listarMesas(req, res));
router.post('/mesas/bloquear', (req, res) => controller.bloquearMesa(req, res));
router.post('/upload', uploadMiddleware.single('foto'), (req, res) => controller.fazerUpload(req, res));
router.post('/reservas', validateSchema(reservaSchema), (req, res) => controller.criarReserva(req, res)); // Validação Zod injetada aqui!
router.post('/checkin', (req, res) => controller.fazerCheckin(req, res));

export default router;