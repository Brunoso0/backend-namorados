import prisma from './config/prisma.js';

async function main() {
  const mesas = await prisma.namorados_mesas.count();
  const reservas = await prisma.namorados_reservas.count();
  const clientes = await prisma.namorados_clientes.count();
  const cardapio = await prisma.namorados_cardapio.count();
  const admins = await prisma.admins_namorados.count();

  console.log('--- DATABASE STATUS ---');
  console.log(`Admins: ${admins}`);
  console.log(`Mesas: ${mesas}`);
  console.log(`Reservas: ${reservas}`);
  console.log(`Clientes: ${clientes}`);
  console.log(`Cardapio: ${cardapio}`);

  if (mesas > 0) {
    const sampleMesa = await prisma.namorados_mesas.findFirst();
    console.log('Sample Mesa:', sampleMesa);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
