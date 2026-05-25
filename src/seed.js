import prisma from './config/prisma.js';

async function main() {
  // Clean old data if any
  await prisma.namorados_reserva_bebidas.deleteMany();
  await prisma.namorados_reserva_integrantes.deleteMany();
  await prisma.namorados_reservas.deleteMany();
  await prisma.namorados_mesas.deleteMany();
  await prisma.namorados_cardapio.deleteMany();
  await prisma.namorados_clientes.deleteMany();

  console.log('Cleared existing Namorados tables.');

  // Seed cardapio (menu items)
  const cardapioItems = [
    // Entradas
    { nome: 'Tábua de Frios Artesanal', descricao: 'Queijos curados, prosciutto di Parma, frutas da estação e mel silvestre.', tipo_item: 'entrada', estoque_disponivel: 99, ativo: true },
    { nome: 'Bruschettas do Chef', descricao: 'Pão de fermentação natural tostado, tomates concassé, manjericão e redução de balsâmico.', tipo_item: 'entrada', estoque_disponivel: 99, ativo: true },
    // Principais
    { nome: 'Risoto de Cogumelos Selvagens', descricao: 'Arroz arbóreo cremoso com cogumelos frescos, trufados e parmesão curado.', tipo_item: 'principal', estoque_disponivel: 99, ativo: true },
    { nome: 'Filé Wellington Clássico', descricao: 'Filé mignon envolto em cogumelos cogumelos picados e massa folhada dourada ao forno.', tipo_item: 'principal', estoque_disponivel: 99, ativo: true },
    { nome: 'Salmão ao Molho de Citrinos', descricao: 'Lombo de salmão grelhado regado a molho de laranja, limão siciliano e especiarias.', tipo_item: 'principal', estoque_disponivel: 99, ativo: true },
    // Sobremesas
    { nome: 'Petit Gateau de Chocolate Belga', descricao: 'Com sorvete artesanal de baunilha Bourbon.', tipo_item: 'sobremesa', estoque_disponivel: 99, ativo: true },
    { nome: 'Cheesecake de Frutas Vermelhas', descricao: 'Coulis de framboesa e frutas frescas.', tipo_item: 'sobremesa', estoque_disponivel: 99, ativo: true },
    // Bebidas
    { nome: 'Vinho Tinto Reserva Especial', descricao: 'Harmonização sugerida para o Filé Wellington.', tipo_item: 'bebida', estoque_disponivel: 99, ativo: true },
    { nome: 'Água Mineral San Pellegrino (750ml)', descricao: 'Natural ou Com Gás.', tipo_item: 'bebida', estoque_disponivel: 99, ativo: true },
  ];

  for (const item of cardapioItems) {
    await prisma.namorados_cardapio.create({ data: item });
  }
  console.log('Seeded menu items.');

  // Seed mesas for slot 19:00 and slot 21:30
  const slots = ['slot_19_00', 'slot_21_30'];
  let count = 0;
  for (const slot of slots) {
    // 18 tables for Terreo (andar = 0)
    for (let i = 1; i <= 18; i++) {
      await prisma.namorados_mesas.create({
        data: {
          numero_mesa: i,
          andar: 0,
          capacidade_maxima: i === 18 ? 10 : 2,
          horario_slot: slot,
          status: 'disponivel',
        }
      });
      count++;
    }
    // 10 tables for 1 Andar (andar = 1)
      for (let i = 19; i <= 29; i++) {
      await prisma.namorados_mesas.create({
        data: {
          numero_mesa: i,
          andar: 1,
          capacidade_maxima: 2,
          horario_slot: slot,
          status: 'disponivel',
        }
      });
      count++;
    }
  }
  console.log(`Seeded ${count} tables across 2 slots.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
