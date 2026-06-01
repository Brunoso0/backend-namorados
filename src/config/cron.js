import prisma from './prisma.js';

export function inicializarCronBloqueios() {
  console.log('🕒 Cron de liberação de mesas bloqueadas inicializado.');
  
  // Executa a cada 1 minuto (60 * 1000 ms)
  setInterval(async () => {
    try {
      const agora = new Date();
      const resultado = await prisma.namorados_mesas.updateMany({
        where: {
          status: 'bloqueada',
          bloqueada_ate: {
            lt: agora
          }
        },
        data: {
          status: 'disponivel',
          bloqueada_ate: null,
          sessao_bloqueio: null
        }
      });
      
      if (resultado.count > 0) {
        console.log(`[CRON] 🔓 Foram liberadas ${resultado.count} mesas que estavam bloqueadas expiradas.`);
      }
    } catch (error) {
      console.error('[CRON] Erro ao liberar mesas bloqueadas:', error);
    }
  }, 60 * 1000);
}

export default null;
