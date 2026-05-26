import * as PagamentoService from '../services/pagamento.service.js';

export async function createPreference(req, res) {
  try {
    const { reserva_id, items, payer, back_urls } = req.body;
    if (!reserva_id || !items) return res.status(400).json({ error: 'reserva_id and items are required' });

    const pref = await PagamentoService.createPreference({ reservaId: reserva_id, items, payer, back_urls });
    return res.json({ sucesso: true, preference: pref });
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

    const result = await PagamentoService.handleNotification(id, topic);
    if (!result) return res.status(204).send();
    return res.json({ ok: true, result });
  } catch (err) {
    console.error('Webhook processing error', err);
    return res.status(500).json({ error: 'Erro no webhook' });
  }
}
