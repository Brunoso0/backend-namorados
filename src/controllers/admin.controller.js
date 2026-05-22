import { AdminService } from '../services/admin.service.js';

const adminService = new AdminService();

export class AdminController {
  async register(req, res) {
    try {
      const { nome, email, senha } = req.body;
      if (!nome || !email || !senha) return res.status(400).json({ sucesso: false, erro: 'DADOS_INCOMPLETOS' });

      const admin = await adminService.createAdmin({ nome, email, senha });
      return res.status(201).json({ sucesso: true, admin: { id: admin.id, nome: admin.nome, email: admin.email } });
    } catch (error) {
      const status = error.message === 'EMAIL_JA_CADASTRADO' ? 409 : 500;
      return res.status(status).json({ sucesso: false, erro: error.message });
    }
  }

  async login(req, res) {
    try {
      const { email, senha } = req.body;
      if (!email || !senha) return res.status(400).json({ sucesso: false, erro: 'DADOS_INCOMPLETOS' });

      const token = await adminService.authenticateAdmin(email, senha);
      return res.status(200).json({ sucesso: true, token });
    } catch (error) {
      const status = ['ADMIN_NAO_ENCONTRADO', 'SENHA_INVALIDA'].includes(error.message) ? 401 : 500;
      return res.status(status).json({ sucesso: false, erro: error.message });
    }
  }

  async me(req, res) {
    try {
      const admin = await adminService.getAdminById(req.adminId);
      if (!admin) return res.status(404).json({ sucesso: false, erro: 'ADMIN_NAO_ENCONTRADO' });
      return res.status(200).json({ sucesso: true, admin: { id: admin.id, nome: admin.nome, email: admin.email, ativo: admin.ativo } });
    } catch (error) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  }

  // Criado para permitir que um admin autenticado crie outros admins
  async create(req, res) {
    try {
      const { nome, email, senha } = req.body;
      if (!nome || !email || !senha) return res.status(400).json({ sucesso: false, erro: 'DADOS_INCOMPLETOS' });

      const admin = await adminService.createAdmin({ nome, email, senha });
      return res.status(201).json({ sucesso: true, admin: { id: admin.id, nome: admin.nome, email: admin.email } });
    } catch (error) {
      const status = error.message === 'EMAIL_JA_CADASTRADO' ? 409 : 500;
      return res.status(status).json({ sucesso: false, erro: error.message });
    }
  }
}
