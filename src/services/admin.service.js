import prisma from '../config/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mudar_para_uma_chave_secreta';

export class AdminService {
  async createAdmin({ nome, email, senha }) {
    const existente = await prisma.admins_namorados.findUnique({ where: { email } });
    if (existente) throw new Error('EMAIL_JA_CADASTRADO');

    const senha_hash = await bcrypt.hash(senha, 10);
    return await prisma.admins_namorados.create({ data: { nome, email, senha_hash } });
  }

  async authenticateAdmin(email, senha) {
    const admin = await prisma.admins_namorados.findUnique({ where: { email } });
    if (!admin) throw new Error('ADMIN_NAO_ENCONTRADO');

    const ok = await bcrypt.compare(senha, admin.senha_hash);
    if (!ok) throw new Error('SENHA_INVALIDA');

    const token = jwt.sign({ adminId: admin.id }, JWT_SECRET, { expiresIn: '8h' });
    return token;
  }

  async getAdminById(id) {
    return await prisma.admins_namorados.findUnique({ where: { id } });
  }
}
