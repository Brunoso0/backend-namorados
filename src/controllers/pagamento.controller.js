import * as PagamentoService from '../services/pagamento.service.js';

export async function createPreference(req, res) {
  try {
    const { reserva_id, payer, back_urls } = req.body;
    if (!reserva_id) return res.status(400).json({ error: 'reserva_id is required' });

    const { preference, total } = await PagamentoService.createPreference({ reservaId: reserva_id, payer, back_urls });
    return res.json({ sucesso: true, preference, total });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao criar preferência MercadoPago' });
  }
}

export async function webhook(req, res) {
  try {
    // MercadoPago sends id and topic as query params for notifications
    const id = req.query.id || req.body.id || req.body.data?.id;
    const topic = req.query.topic || req.query.type || req.body.type || req.body.topic;

    const result = await PagamentoService.handleNotification(id, topic, req.body);
    if (!result) return res.status(204).send();
    return res.json({ ok: true, result });
  } catch (err) {
    console.error('Webhook processing error', err);
    return res.status(500).json({ error: 'Erro no webhook' });
  }
}

export async function syncPayment(req, res) {
  try {
    const { payment_id, external_reference } = req.body;
    if (!payment_id || !external_reference) {
      return res.status(400).json({ error: 'payment_id and external_reference are required' });
    }

    const result = await PagamentoService.syncPayment(payment_id, external_reference);
    if (result.success) {
      return res.json({ sucesso: true, reserva: result.reserva });
    } else {
      return res.status(400).json({ error: result.reason });
    }
  } catch (err) {
    console.error('Error syncing payment:', err);
    return res.status(500).json({ error: 'Erro ao sincronizar pagamento' });
  }
}
