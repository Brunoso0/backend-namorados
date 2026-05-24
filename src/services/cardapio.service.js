import prisma from '../config/prisma.js';

export class CardapioService {
  async criarPrato({ nome, descricao, tipo_item, estoque_disponivel, ativo }) {
    return await prisma.namorados_cardapio.create({
      data: {
        nome,
        descricao,
        tipo_item,
        estoque_disponivel: estoque_disponivel ?? 0,
        ativo: ativo ?? true,
      },
    });
  }

  async editarPrato(id, { nome, descricao, tipo_item, estoque_disponivel, ativo }) {
    return await prisma.namorados_cardapio.update({
      where: { id },
      data: {
        nome,
        descricao,
        tipo_item,
        estoque_disponivel,
        ativo,
      },
    });
  }

  async deletarPrato(id) {
    await prisma.namorados_cardapio.delete({ where: { id } });
  }
}
