import mercadopago from 'mercadopago';

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.GATEWAY_API_KEY || '';

if (!accessToken) {
  console.warn('MercadoPago access token not set. Set MERCADOPAGO_ACCESS_TOKEN in .env');
}

mercadopago.configure({ access_token: accessToken });

export default mercadopago;
