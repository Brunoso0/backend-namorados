import jwt from 'jsonwebtoken';
import { AdminService } from '../services/admin.service.js';

const adminService = new AdminService();
const JWT_SECRET = process.env.JWT_SECRET || 'mudar_para_uma_chave_secreta';

export const requireAdmin = async (req, res, next) => {
  try {
    const auth = req.headers.authorization || '';
    const [, token] = auth.split(' ');
    if (!token) return res.status(401).json({ sucesso: false, erro: 'TOKEN_INDISPONIVEL' });

    const payload = jwt.verify(token, JWT_SECRET);
    req.adminId = payload.adminId;

    const admin = await adminService.getAdminById(req.adminId);
    if (!admin || !admin.ativo) return res.status(403).json({ sucesso: false, erro: 'ACESSO_NEGADO' });

    next();
  } catch (error) {
    return res.status(401).json({ sucesso: false, erro: 'TOKEN_INVALIDO' });
  }
};
