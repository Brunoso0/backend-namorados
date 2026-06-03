import mercadopago from '../config/mercadopago.js';
import prisma from '../config/prisma.js';

async function buildItemsAndTotalFromReserva(reservaId) {
  const reserva = await prisma.namorados_reservas.findUnique({
    where: { id: Number(reservaId) },
    include: {
      cliente: true, // ADICIONADO: precisamos dos dados do cliente para payer.last_name
      entrada: true,
      integrantes: { include: { principal: true, sobremesa: true } },
      bebidas_intencao: { include: { bebida: true } }
    }
  });

  if (!reserva) throw new Error('Reserva not found');

  const items = [];
  let total = 0;

  // Entrada (only add to items if there is a positive price)
  if (reserva.entrada) {
    const preco = Number(reserva.entrada.preco_garrafa || reserva.entrada.preco_taca || 0);
    if (preco > 0) {
      items.push({ title: `Entrada: ${reserva.entrada.nome}`, quantity: 1, unit_price: preco });
    }
    total += preco;
  }

  // Integrantes (principais + sobremesa)
  for (const integ of reserva.integrantes || []) {
    if (integ.principal) {
      const preco = Number(integ.principal.preco_garrafa || integ.principal.preco_taca || 0);
      if (preco > 0) {
        items.push({ title: `Principal: ${integ.principal.nome}`, quantity: 1, unit_price: preco });
      }
      total += preco;
    }
    if (integ.sobremesa) {
      const preco = Number(integ.sobremesa.preco_garrafa || integ.sobremesa.preco_taca || 0);
      if (preco > 0) {
        items.push({ title: `Sobremesa: ${integ.sobremesa.nome}`, quantity: 1, unit_price: preco });
      }
      total += preco;
    }
  }

  // Bebidas intenção
  for (const b of reserva.bebidas_intencao || []) {
    const bebida = b.bebida;
    if (!bebida) continue;
    const preco = b.tipo_consumo === 'garrafa' ? Number(bebida.preco_garrafa || 0) : Number(bebida.preco_taca || 0);
    if (preco > 0) {
      items.push({ title: `Bebida: ${bebida.nome}`, quantity: b.quantidade || 1, unit_price: preco });
    }
    total += preco * (b.quantidade || 1);
  }

  return { items, total, reserva };
}

export async function createPreference({ reservaId, payer, back_urls }) {
  // Build items and total server-side to avoid trusting frontend
  const { items, total, reserva } = await buildItemsAndTotalFromReserva(reservaId);
  
  // Base package price (defaults to 600.00 if not specified)
  const basePrice = Number(process.env.NAMORADOS_RESERVA_PRECO || process.env.NAMORADOS_PACKAGE_PRICE || 600.00);

  // The final items list must ALWAYS include the base package price
  const finalItems = [
    { title: 'Pacote Reserva Dia dos Namorados - JrCoffee', quantity: 1, unit_price: basePrice, description: 'Reserva de mesa e menu para o Dia dos Namorados' },
    ...items.map(item => ({ ...item, description: item.description || item.title }))
  ];

  const computedTotal = basePrice + total;

  // Persist computed total in reserva (atomic update)
  await prisma.namorados_reservas.update({ where: { id: Number(reservaId) }, data: { valor_total: computedTotal } });

  // Ensure payer has last_name (Mercado Pago recommends `payer.last_name`)
  const finalPayer = { ...(payer || {}) };
  if (!finalPayer.last_name) {
    const fullName = reserva?.cliente?.nome_completo || finalPayer.name || '';
    const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
    finalPayer.last_name = parts.length > 1 ? parts.slice(-1).join(' ') : '';
    if (!finalPayer.name && parts.length > 0) finalPayer.name = parts.slice(0, -1).join(' ') || parts[0];
  }

  const preference = {
    items: finalItems,
    payer: finalPayer,
    external_reference: String(reserva.token_voucher),
    back_urls: back_urls || {
      success: process.env.MERCADOPAGO_BACK_URL_SUCCESS || `${process.env.APP_URL || 'http://localhost:3001'}/success`,
      failure: process.env.MERCADOPAGO_BACK_URL_FAILURE || `${process.env.APP_URL || 'http://localhost:3001'}/failure`,
      pending: process.env.MERCADOPAGO_BACK_URL_PENDING || `${process.env.APP_URL || 'http://localhost:3001'}/pending`,
    },
    notification_url: process.env.MERCADOPAGO_WEBHOOK_URL || `${process.env.APP_URL || 'http://localhost:3001'}/api/v1/pagamento/webhook`,
    auto_return: 'approved',
  };

  console.log("MERCADOPAGO PREFERENCE SENDING:", JSON.stringify(preference, null, 2));
  const response = await mercadopago.preferences.create({ body: preference });
  return { preference: response, total: computedTotal };
}

export async function processPaymentStatusUpdate(externalReference, paymentStatus, paymentId) {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch reservation
    const reserva = await tx.namorados_reservas.findUnique({
      where: { token_voucher: externalReference },
      include: { mesa: true }
    });

    if (!reserva) {
      return { success: false, reason: 'Reservation not found for this external_reference' };
    }

    if (reserva.status_pagamento === 'pago') {
      return { success: true, action: 'already_paid' };
    }

    if (paymentStatus === 'approved') {
      // Check retry scenario
      if (reserva.status_pagamento === 'recusado') {
        // Verify if mesa is still available
        if (reserva.mesa && reserva.mesa.status === 'disponivel') {
          // Mesa is available: update reservation to pago and lock mesa
          await tx.namorados_reservas.update({
            where: { id: reserva.id },
            data: { status_pagamento: 'pago', transacao_gateway_id: String(paymentId) }
          });
          await tx.namorados_mesas.update({
            where: { id: reserva.mesa_id },
            data: { status: 'reservada', sessao_bloqueio: null, bloqueada_ate: null }
          });
          return { success: true, action: 'approved_retry_success' };
        } else {
          // Mesa is already occupied/blocked!
          // Maintain payment but signal conflict_mesa
          await tx.namorados_reservas.update({
            where: { id: reserva.id },
            data: { status_pagamento: 'conflito_mesa', transacao_gateway_id: String(paymentId) }
          });
          return { success: true, action: 'approved_retry_conflict' };
        }
      } else {
        // Normal flow (pending/etc.) -> pago
        await tx.namorados_reservas.update({
          where: { id: reserva.id },
          data: { status_pagamento: 'pago', transacao_gateway_id: String(paymentId) }
        });
        if (reserva.mesa_id) {
          await tx.namorados_mesas.update({
            where: { id: reserva.mesa_id },
            data: { status: 'reservada', sessao_bloqueio: null, bloqueada_ate: null }
          });
        }
        return { success: true, action: 'approved_normal' };
      }
    } else if (paymentStatus === 'rejected' || paymentStatus === 'cancelled') {
      // Update reservation to recusado
      await tx.namorados_reservas.update({
        where: { id: reserva.id },
        data: { status_pagamento: 'recusado', transacao_gateway_id: String(paymentId) }
      });
      // Free the table immediately
      if (reserva.mesa_id) {
        await tx.namorados_mesas.update({
          where: { id: reserva.mesa_id },
          data: { status: 'disponivel', sessao_bloqueio: null, bloqueada_ate: null }
        });
      }
      return { success: true, action: 'rejected_or_cancelled' };
    }

    return { success: false, reason: `Unhandled payment status: ${paymentStatus}` };
  });
}

export async function handleNotification(id, topic, rawBody = {}) {
  try {
    let paymentData = null;

    // 1. Tentar extrair o ID corretamente do evento (prioriza data.id)
    let eventId = id;
    if (!eventId && rawBody?.data?.id) eventId = rawBody.data.id;
    if (!eventId && rawBody?.id) eventId = rawBody.id;
    if (!eventId && rawBody?.resource) {
      const parts = String(rawBody.resource).split('/').filter(Boolean);
      eventId = parts.length ? parts.pop() : eventId;
    }

    // 2. Normalizar o tópico (algumas variações contém 'payment')
    const normalizedTopic = typeof topic === 'string' && topic.includes('payment') ? 'payment' : topic;

    // 3. Roteamento inteligente baseado no tópico
    if (normalizedTopic === 'merchant_order') {
      try {
        const mo = await mercadopago.merchant_orders.get({ merchantOrderId: eventId });
        const payments = mo?.body?.payments || mo?.response?.payments || mo?.payments || [];
        paymentData = payments[0] || null;
      } catch (e) {
        console.error(`Falha ao buscar merchant_order ID ${eventId}:`, e?.message || e);
      }
    } else if (normalizedTopic === 'payment') {
      try {
        const resp = await mercadopago.payment.get({ id: eventId });
        paymentData = resp?.body || resp?.response || resp;
      } catch (err) {
        console.error(`Falha ao buscar pagamento ID ${eventId} no Mercado Pago:`, err?.message || err);
      }
    } else {
      // Fallback: tentar payment primeiro, depois merchant_order
      if (eventId) {
        try {
          const resp = await mercadopago.payment.get({ id: eventId });
          paymentData = resp?.body || resp?.response || resp;
        } catch (err) {
          console.error(`Falha ao buscar pagamento ID ${eventId}:`, err?.message || err);
          paymentData = null;
        }
      }
      if (!paymentData && eventId) {
        try {
          const mo = await mercadopago.merchant_orders.get({ merchantOrderId: eventId });
          const payments = mo?.body?.payments || mo?.response?.payments || mo?.payments || [];
          paymentData = payments[0] || null;
        } catch (e) {
          console.error(`Falha ao buscar merchant_order ID ${eventId}:`, e?.message || e);
        }
      }
    }

    // manter `id` para logs/fallbacks posteriores
    id = eventId || id;

    // If still not found, attempt to parse external_reference from body (some test payloads send it)
    let externalRef = null;
    if (paymentData) {
      externalRef = paymentData.external_reference || paymentData.order?.external_reference || paymentData.additional_info?.items?.[0]?.external_reference;
    } else {
      // try to parse patterns like "DATE;TOKEN" or body.data
      const dataField = rawBody.data?.id || rawBody.data?.external_reference || rawBody.data || rawBody;
      if (typeof dataField === 'string' && dataField.includes(';')) {
        externalRef = dataField.split(';')[1];
      }
      if (!externalRef && rawBody?.external_reference) externalRef = rawBody.external_reference;
      if (!externalRef && rawBody?.order?.external_reference) externalRef = rawBody.order.external_reference;
    }

    // Final fallback: try to find reservation by token in body (unsafe for production, but helpful for tests)
    if (!externalRef && id && typeof id === 'string' && id.includes(';')) {
      externalRef = id.split(';')[1];
    }

    if (!externalRef) {
      console.warn('No external reference found in MercadoPago notification', { id, topic, rawBody });
      return { updated: false, reason: 'no_external_reference' };
    }

    const paymentStatus = paymentData?.status;
    if (!paymentStatus) {
      console.warn('Could not determine payment status from MercadoPago notification', { id, topic, rawBody });
      return { updated: false, reason: 'no_payment_status' };
    }

    const result = await processPaymentStatusUpdate(externalRef, paymentStatus, paymentData.id || id);
    return { updated: result.success };
  } catch (err) {
    console.error('Error handling MercadoPago notification', err);
    throw err;
  }
}

export async function syncPayment(paymentId, externalReference) {
  try {
    if (!paymentId) throw new Error('payment_id is required');
    if (!externalReference) throw new Error('external_reference is required');

    // Consultar a API do Mercado Pago pelo payment_id
    const payment = await mercadopago.payment.get({ id: String(paymentId) });
    const paymentData = payment?.body || payment?.response || payment;
    const paymentStatus = paymentData?.status;

    if (!paymentStatus) {
      return { success: false, reason: 'Could not determine payment status' };
    }

    const result = await processPaymentStatusUpdate(externalReference, paymentStatus, paymentId);

    if (result.success) {
      // Buscar a reserva atualizada com todos os relacionamentos para retornar ao frontend
      const reservaCompleta = await prisma.namorados_reservas.findFirst({
        where: { token_voucher: externalReference },
        include: {
          cliente: true,
          mesa: true,
          integrantes: { include: { principal: true, sobremesa: true } },
          bebidas_intencao: { include: { bebida: true } }
        }
      });

      return { success: true, status: paymentStatus, action: result.action, reserva: reservaCompleta };
    }

    return { success: false, status: paymentStatus, reason: result.reason };
  } catch (err) {
    console.error('Error syncing payment:', err);
    throw err;
  }
}
