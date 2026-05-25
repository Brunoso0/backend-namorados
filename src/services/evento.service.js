import prisma from '../config/prisma.js';
import QRCode from 'qrcode';

export class EventoService {
  
  async obterCardapio() {
    const itens = await prisma.namorados_cardapio.findMany({ where: { ativo: true } });
    return {
      entradas: itens.filter(i => i.tipo_item === 'entrada'),
      principais: itens.filter(i => i.tipo_item === 'principal'),
      sobremesas: itens.filter(i => i.tipo_item === 'sobremesa'),
      bebidas: itens.filter(i => i.tipo_item === 'bebida'),
    };
  }

  async obterMesasPorHorario(horario_slot) {
    return await prisma.namorados_mesas.findMany({ where: { horario_slot } });
  }

  async bloquearMesa(mesaId, sessaoBloqueio) {
    return await prisma.$transaction(async (tx) => {
      const mesa = await tx.namorados_mesas.findUnique({ where: { id: mesaId } });
      if (!mesa) throw new Error('MESA_NAO_ENCONTRADA');

      const agora = new Date();
      if (mesa.status === 'reservada') throw new Error('MESA_JA_RESERVADA');
      if (mesa.status === 'bloqueada' && mesa.sessao_bloqueio !== sessaoBloqueio && mesa.bloqueada_ate > agora) {
        throw new Error('MESA_OCUPADA_TEMPORARIAMENTE');
      }

      const trintaMinutosDepois = new Date(agora.getTime() + 30 * 60 * 1000);
      return await tx.namorados_mesas.update({
        where: { id: mesaId },
        data: { status: 'bloqueada', sessao_bloqueio: sessaoBloqueio, bloqueada_ate: trintaMinutosDepois },
      });
    });
  }

  async criarReservaCompleta(dados) {
    const { cliente, mesa_id, sessao_bloqueio, entrada_cardapio_id, observacoes, foto_url, integrantes, bebidas_intencao } = dados;

    const mesa = await prisma.namorados_mesas.findUnique({ where: { id: mesa_id } });
    if (!mesa || mesa.status === 'reservada' || (mesa.status === 'bloqueada' && mesa.sessao_bloqueio !== sessao_bloqueio)) {
      throw new Error('MESA_INDISPONIVEL');
    }

    const tokenVoucher = `VCH-${Math.random().toString(36).substr(2, 9).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const valorTotal = 480.00; // Valor padrão da reserva (Pacote casal)

    const reserva = await prisma.$transaction(async (tx) => {
      const dbCliente = await tx.namorados_clientes.upsert({
        where: { email: cliente.email },
        update: { nome_completo: cliente.nome_completo, whatsapp: cliente.whatsapp },
        create: { nome_completo: cliente.nome_completo, email: cliente.email, whatsapp: cliente.whatsapp }
      });

      const novaReserva = await tx.namorados_reservas.create({
        data: {
          cliente_id: dbCliente.id,
          mesa_id,
          entrada_cardapio_id,
          observacoes,
          foto_url,
          valor_total: valorTotal,
          token_voucher: tokenVoucher,
        }
      });

      if (integrantes?.length > 0) {
        await tx.namorados_reserva_integrantes.createMany({
          data: integrantes.map(i => ({
            reserva_id: novaReserva.id,
            nome_integrante: i.nome_integrante,
            principal_cardapio_id: i.principal_cardapio_id,
            sobremesa_cardapio_id: i.sobremesa_cardapio_id
          }))
        });
      }

      if (bebidas_intencao?.length > 0) {
        await tx.namorados_reserva_bebidas.createMany({
          data: bebidas_intencao.map(b => ({
            reserva_id: novaReserva.id,
            bebida_cardapio_id: b.bebida_cardapio_id,
            tipo_consumo: b.tipo_consumo,
            quantidade: b.quantidade
          }))
        });
      }

      await tx.namorados_mesas.update({
        where: { id: mesa_id },
        data: { status: 'reservada', sessao_bloqueio: null, bloqueada_ate: null }
      });

      return novaReserva;
    });

    const qrCodeBase64 = await QRCode.toDataURL(tokenVoucher);
    
    return { reserva_id: reserva.id, token_voucher: tokenVoucher, qr_code: qrCodeBase64, valor_total: valorTotal };
  }

  async realizarCheckin(tokenVoucher) {
    const reserva = await prisma.namorados_reservas.findUnique({
      where: { token_voucher: tokenVoucher },
      include: { cliente: true, mesa: true, integrantes: { include: { principal: true, sobremesa: true } } }
    });

    if (!reserva) throw new Error('VOUCHER_NAO_ENCONTRADO');
    if (reserva.check_in_realizado) throw new Error('CHECKIN_JA_REALIZADO');

    await prisma.namorados_reservas.update({
      where: { id: reserva.id },
      data: { check_in_realizado: true, data_check_in: new Date() }
    });

    return {
      mesa: reserva.mesa.numero_mesa,
      horario: reserva.mesa.horario_slot,
      nome_cliente: reserva.cliente.nome_completo,
      observacoes: reserva.observacoes,
      integrantes: reserva.integrantes.map(i => ({
        nome: i.nome_integrante,
        prato: i.principal.nome
      }))
    };
  }
}