import * as MP from 'mercadopago';

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.GATEWAY_API_KEY || '';

if (!accessToken) {
  console.warn('MercadoPago access token not set. Set MERCADOPAGO_ACCESS_TOKEN in .env');
}

// Support both named/default/namespace imports from the SDK build
const ConfigClass = MP.MercadoPagoConfig || MP.default || MP;
const Preference = MP.Preference || MP.default?.Preference;
const Payment = MP.Payment || MP.default?.Payment;
const MerchantOrder = MP.MerchantOrder || MP.default?.MerchantOrder || MP.MerchantOrder;

const config = new ConfigClass({ accessToken });

const preferenceClient = new Preference(config);
const paymentClient = new Payment(config);
const merchantOrderClient = new MerchantOrder(config);

// Export a small compatibility surface similar to older SDK (preferences, payment, merchant_orders)
const mercadopagoCompat = {
  preferences: preferenceClient,
  payment: paymentClient,
  merchant_orders: merchantOrderClient,
};

export default mercadopagoCompat;
