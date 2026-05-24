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

  // --- NOVOS MÉTODOS DE CONTROLLER PARA O PAINEL DE CONTROLE ---

  async listarReservas(req, res) {
    try {
      const reservas = await adminService.listarReservas();
      return res.status(200).json({ sucesso: true, reservas });
    } catch (error) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  }

  async buscarReservas(req, res) {
    try {
      const { busca } = req.query;
      const reservas = await adminService.buscarReservas(busca || '');
      return res.status(200).json({ sucesso: true, reservas });
    } catch (error) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  }

  async atualizarValorReserva(req, res) {
    try {
      const { id } = req.params;
      const { valor } = req.body;
      if (valor === undefined) return res.status(400).json({ sucesso: false, erro: 'VALOR_OBRIGATORIO' });

      const reserva = await adminService.atualizarValorReserva(Number(id), Number(valor));
      return res.status(200).json({ sucesso: true, reserva });
    } catch (error) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  }

  async listarMesasAdmin(req, res) {
    try {
      const { horario_slot } = req.query;
      if (!horario_slot) return res.status(400).json({ sucesso: false, mensagem: 'horario_slot é obrigatório.' });

      const mesas = await adminService.obterMesasAdmin(horario_slot);
      return res.status(200).json({ sucesso: true, mesas });
    } catch (error) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  }

  async obterDetalhesMesa(req, res) {
    try {
      const { id } = req.params;
      const { horario_slot } = req.query;
      if (!horario_slot) return res.status(400).json({ sucesso: false, mensagem: 'horario_slot é obrigatório.' });

      const detalhe = await adminService.obterDetalhesMesa(Number(id), horario_slot);
      if (!detalhe) return res.status(404).json({ sucesso: false, erro: 'DETALHES_NAO_ENCONTRADOS' });

      return res.status(200).json({ sucesso: true, detalhe });
    } catch (error) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  }

  async atualizarStatusMesa(req, res) {
    try {
      const { id } = req.params;
      const { status, horario_slot } = req.body;
      if (!status) return res.status(400).json({ sucesso: false, erro: 'STATUS_OBRIGATORIO' });

      const resultado = await adminService.atualizarStatusMesa(Number(id), status, horario_slot);
      return res.status(200).json({ sucesso: true, ...resultado });
    } catch (error) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  }
}
