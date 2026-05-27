import { EventoService } from '../services/evento.service.js';
import { emitirCheckInParaOPainel } from '../config/sse.js';

const eventoService = new EventoService();

export class EventoController {
  
  async listarCardapio(req, res) {
    try {
      const cardapio = await eventoService.obterCardapio();
      return res.status(200).json(cardapio);
    } catch (error) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  }

  async listarMesas(req, res) {
    try {
      const { horario_slot } = req.query;
      if (!horario_slot) return res.status(400).json({ sucesso: false, mensagem: 'horario_slot é obrigatório.' });

      const mesas = await eventoService.obterMesasPorHorario(horario_slot);
      return res.status(200).json({ horario_slot, mesas });
    } catch (error) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  }

  async bloquearMesa(req, res) {
    try {
      const { mesa_id, sessao_bloqueio } = req.body;
      const mesa = await eventoService.bloquearMesa(Number(mesa_id), sessao_bloqueio);
      return res.status(200).json({ sucesso: true, bloqueada_ate: mesa.bloqueada_ate });
    } catch (error) {
      const status = ['MESA_JA_RESERVADA', 'MESA_OCUPADA_TEMPORARIAMENTE'].includes(error.message) ? 409 : 500;
      return res.status(status).json({ sucesso: false, erro: error.message });
    }
  }

  async fazerUpload(req, res) {
    try {
      if (!req.file) return res.status(400).json({ sucesso: false, erro: 'ARQUIVO_NAO_ENVIADO' });
      const url = `http://localhost:${process.env.PORT || 3003}/uploads/${req.file.filename}`;
      return res.status(200).json({ sucesso: true, url });
    } catch (error) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  }

  async criarReserva(req, res) {
    try {
      const resultado = await eventoService.criarReservaCompleta(req.body);
      // resultado deve conter init_point e reserva_id
      return res.status(201).json({ sucesso: true, ...resultado });
    } catch (error) {
      if (error.message === 'MESA_INDISPONIVEL') return res.status(409).json({ sucesso: false, erro: error.message });
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  }

  async buscarReserva(req, res) {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ sucesso: false, erro: 'id é obrigatório' });
      const reserva = await eventoService.obterReservaPorId(Number(id));
      if (!reserva) return res.status(404).json({ sucesso: false, erro: 'RESERVA_NAO_ENCONTRADA' });
      return res.status(200).json({ sucesso: true, reserva });
    } catch (error) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  }

  async fazerCheckin(req, res) {
    try {
      const { token_voucher } = req.body;
      const dadosDoCasal = await eventoService.realizarCheckin(token_voucher);
      
      // Emite o evento para o painel de controle em tempo real
      emitirCheckInParaOPainel(dadosDoCasal);

      return res.status(200).json({ sucesso: true, mensagem: 'Entrada autorizada!', dados: dadosDoCasal });
    } catch (error) {
      const status = error.message === 'VOUCHER_NAO_ENCONTRADO' ? 404 : 400;
      return res.status(status).json({ sucesso: false, erro: error.message });
    }
  }
}