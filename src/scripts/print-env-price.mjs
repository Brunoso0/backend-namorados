import 'dotenv/config';
import { getEnvNumber } from '../config/env.js';

console.log('NAMORADOS_RESERVA_PRECO raw:', process.env.NAMORADOS_RESERVA_PRECO);
console.log('Parsed price:', getEnvNumber('NAMORADOS_RESERVA_PRECO'));
console.log('NAMORADOS_PACKAGE_PRICE raw:', process.env.NAMORADOS_PACKAGE_PRICE);
console.log('Parsed package fallback:', getEnvNumber('NAMORADOS_PACKAGE_PRICE'));
