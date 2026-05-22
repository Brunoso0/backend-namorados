import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';

const router = Router();
const controller = new AdminController();

router.post('/register', (req, res) => controller.register(req, res));
router.post('/create', requireAdmin, (req, res) => controller.create(req, res));
router.post('/login', (req, res) => controller.login(req, res));
router.get('/me', requireAdmin, (req, res) => controller.me(req, res));

export default router;
