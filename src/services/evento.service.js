import prisma from '../config/prisma.js';
import { getEnvNumber } from '../config/env.js';
import QRCode from 'qrcode';
import * as PagamentoService from './pagamento.service.js';

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
    // Normalize aliases: frontend may send 'slot_21_30' but Prisma enum only has 'slot_21_00' and 'slot_19_00'
    let slot = horario_slot;
    if (!slot) throw new Error('HORARIO_SLOT_OBRIGATORIO');
    if (slot === 'slot_21_30') slot = 'slot_21_00';

    // validate allowed values to avoid Prisma enum errors
    const allowed = ['slot_19_00', 'slot_21_00'];
    if (!allowed.includes(slot)) throw new Error('HORARIO_SLOT_INVALIDO');

    return await prisma.namorados_mesas.findMany({ where: { horario_slot: slot } });
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

      const dezMinutosDepois = new Date(Date.now() + 10 * 60 * 1000);
      return await tx.namorados_mesas.update({
        where: { id: mesaId },
        data: { status: 'bloqueada', sessao_bloqueio: sessaoBloqueio, bloqueada_ate: dezMinutosDepois },
      });
    });
  }

  async criarReservaCompleta(dados) {
    const { cliente, mesa_id, sessao_bloqueio, entrada_cardapio_id, observacoes, foto_url } = dados;
    let { integrantes, bebidas_intencao } = dados;

    // Sanitize and validate incoming arrays to avoid Prisma unchecked nested create errors
    if (!Array.isArray(integrantes)) integrantes = [];
    integrantes = integrantes.map(i => ({
      nome_integrante: i?.nome_integrante ? String(i.nome_integrante).trim() : '',
      principal_cardapio_id: Number(i?.principal_cardapio_id) || null,
      sobremesa_cardapio_id: Number(i?.sobremesa_cardapio_id) || null
    }));

    if (!Array.isArray(bebidas_intencao)) bebidas_intencao = [];
    bebidas_intencao = bebidas_intencao.map(b => ({
      bebida_cardapio_id: Number(b?.bebida_cardapio_id) || null,
      tipo_consumo: b?.tipo_consumo || null,
      quantidade: Number(b?.quantidade) || 1
    }));

    // Basic server-side validation
    const invalids = [];
    if (!cliente || !cliente.email) invalids.push('cliente.email');
    if (!mesa_id) invalids.push('mesa_id');
    if (!sessao_bloqueio) invalids.push('sessao_bloqueio');
    if (!entrada_cardapio_id) invalids.push('entrada_cardapio_id');
    integrantes.forEach((it, idx) => {
      if (!it.nome_integrante) invalids.push(`integrantes[${idx}].nome_integrante`);
      if (!it.principal_cardapio_id) invalids.push(`integrantes[${idx}].principal_cardapio_id`);
      if (!it.sobremesa_cardapio_id) invalids.push(`integrantes[${idx}].sobremesa_cardapio_id`);
    });
    bebidas_intencao.forEach((b, idx) => {
      if (!b.bebida_cardapio_id) invalids.push(`bebidas_intencao[${idx}].bebida_cardapio_id`);
      if (!['garrafa', 'taca'].includes(b.tipo_consumo)) invalids.push(`bebidas_intencao[${idx}].tipo_consumo`);
    });
    if (invalids.length > 0) {
      const err = new Error('DADOS_INVALIDOS_SERVER');
      err.details = invalids;
      throw err;
    }

    const mesa = await prisma.namorados_mesas.findUnique({ where: { id: mesa_id } });
    if (!mesa || mesa.status === 'reservada' || (mesa.status === 'bloqueada' && mesa.sessao_bloqueio !== sessao_bloqueio)) {
      throw new Error('MESA_INDISPONIVEL');
    }

    const tokenVoucher = `VCH-${Math.random().toString(36).substr(2, 9).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const packagePrice = getEnvNumber('NAMORADOS_RESERVA_PRECO', getEnvNumber('NAMORADOS_PACKAGE_PRICE', 600.00));

    // Criar reserva e manter mesa bloqueada (status_pagamento = 'pendente')
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
          valor_total: packagePrice,
          token_voucher: tokenVoucher,
          status_pagamento: 'pendente'
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

      // Marcar mesa como bloqueada (não marcada como reservada até confirmação do pagamento)
      const dezMinutosDepois = new Date(Date.now() + 5 * 60 * 1000);
      await tx.namorados_mesas.update({
        where: { id: mesa_id },
        data: { status: 'bloqueada', sessao_bloqueio, bloqueada_ate: dezMinutosDepois }
      });

      return novaReserva;
    });

    // Criar preferência de pagamento usando o serviço de pagamento
    const payer = { name: cliente.nome_completo, email: cliente.email, phone: { number: cliente.whatsapp || '' } };
    const hostFrontend = process.env.FRONTEND_URL_NAMORADOS || process.env.APP_URL || 'http://localhost:3000';
    const back_urls = {
      success: `${hostFrontend.replace(/\/$/, '')}/namorados/sucesso`,
      failure: `${hostFrontend.replace(/\/$/, '')}/namorados/erro`,
      pending: `${hostFrontend.replace(/\/$/, '')}/namorados/pendente`
    };

    try {
      const { preference, total } = await PagamentoService.createPreference({ reservaId: reserva.id, payer, back_urls });

      // extrair init_point e id da preference de forma resiliente
      const prefBody = preference?.body || preference?.response || preference;
      const init_point = prefBody?.init_point || prefBody?.sandbox_init_point || null;
      const prefId = prefBody?.id || prefBody?.preference_id || null;

      // Salvar transacao_gateway_id e valor_total calculado
      await prisma.namorados_reservas.update({ where: { id: reserva.id }, data: { transacao_gateway_id: String(prefId || ''), valor_total: Number(total || 0) } });

      return { init_point, reserva_id: reserva.id };
    } catch (err) {
      // Attempt to rollback reservation and unlock the mesa to avoid leaving it blocked
      try {
        await prisma.namorados_reservas.delete({ where: { id: reserva.id } });
      } catch (e) {
        console.warn('Falha ao excluir reserva após erro de pagamento', e);
      }
      try {
        await prisma.namorados_mesas.update({ where: { id: mesa_id }, data: { status: 'disponivel', sessao_bloqueio: null, bloqueada_ate: null } });
      } catch (e) {
        console.warn('Falha ao liberar mesa após erro de pagamento', e);
      }
      const errOut = new Error('ERRO_PAGAMENTO');
      errOut.details = err?.message || String(err);
      throw errOut;
    }
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

  async obterReservaPorId(id) {
    const reserva = await prisma.namorados_reservas.findUnique({
      where: { id: Number(id) },
      include: {
        cliente: true,
        mesa: true,
        integrantes: { include: { principal: true, sobremesa: true } },
        bebidas_intencao: { include: { bebida: true } }
      }
    });
    return reserva;
  }
}