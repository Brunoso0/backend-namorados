import mercadopago from '../config/mercadopago.js';
import prisma from '../config/prisma.js';

export async function createPreference({ reservaId, items, payer, back_urls }) {
  const preference = {
    items,
    payer,
    external_reference: String(reservaId),
    back_urls: back_urls || {
      success: process.env.MERCADOPAGO_BACK_URL_SUCCESS || `${process.env.APP_URL || 'http://localhost:3001'}/success`,
      failure: process.env.MERCADOPAGO_BACK_URL_FAILURE || `${process.env.APP_URL || 'http://localhost:3001'}/failure`,
      pending: process.env.MERCADOPAGO_BACK_URL_PENDING || `${process.env.APP_URL || 'http://localhost:3001'}/pending`,
    },
    notification_url: process.env.MERCADOPAGO_WEBHOOK_URL || `${process.env.APP_URL || 'http://localhost:3001'}/api/v1/pagamento/webhook`,
    auto_return: 'approved',
  };

  const response = await mercadopago.preferences.create(preference);
  return response.body;
}

export async function handleNotification(id, topic) {
  try {
    let paymentData = null;

    if (!id) return null;

    if (topic === 'payment' || topic === 'payment.created' || topic === 'payment.updated') {
      const resp = await mercadopago.payment.get(id);
      paymentData = resp.body;
    } else if (topic === 'merchant_order') {
      const resp = await mercadopago.merchant_orders.get(id);
      const payments = resp.body.payments || [];
      paymentData = payments[0] || null;
    } else {
      // fallback: try to get payment
      try {
        const resp = await mercadopago.payment.get(id);
        paymentData = resp.body;
      } catch (e) {
        paymentData = null;
      }
    }

    if (!paymentData) return null;

    const externalRef = paymentData.external_reference || paymentData.order?.external_reference || paymentData.additional_info?.items?.[0]?.external_reference;
    const paymentId = paymentData.id || paymentData.payment_id || id;

    if (!externalRef) return { updated: false, reason: 'no_external_reference' };

    // Update reservation by token_voucher (external reference expected to be reserva token)
    const updated = await prisma.namorados_reservas.updateMany({
      where: { token_voucher: externalRef },
      data: { status_pagamento: 'pago', transacao_gateway_id: String(paymentId) }
    });

    return { updated: updated.count > 0 };
  } catch (err) {
    console.error('Error handling MercadoPago notification', err);
    throw err;
  }
}
