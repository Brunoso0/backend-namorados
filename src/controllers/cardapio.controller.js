import { CardapioService } from '../services/cardapio.service.js';

const cardapioService = new CardapioService();

export class CardapioController {
  async criarPrato(req, res) {
    try {
      const { nome, descricao, tipo_item, estoque_disponivel, ativo, imagem } = req.body;
      if (!nome || !tipo_item) return res.status(400).json({ sucesso: false, erro: 'DADOS_INCOMPLETOS' });
      const prato = await cardapioService.criarPrato({ nome, descricao, tipo_item, estoque_disponivel, ativo, imagem });
      return res.status(201).json({ sucesso: true, prato });
    } catch (error) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  }

  async editarPrato(req, res) {
    try {
      const { id } = req.params;
      const { nome, descricao, tipo_item, estoque_disponivel, ativo, imagem } = req.body;
      const prato = await cardapioService.editarPrato(Number(id), { nome, descricao, tipo_item, estoque_disponivel, ativo, imagem });
      return res.status(200).json({ sucesso: true, prato });
    } catch (error) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  }

  async deletarPrato(req, res) {
    try {
      const { id } = req.params;
      await cardapioService.deletarPrato(Number(id));
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  }
}
