import prisma from '../config/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mudar_para_uma_chave_secreta';

export class AdminService {
  async createAdmin({ nome, email, senha }) {
    const existente = await prisma.admins_namorados.findUnique({ where: { email } });
    if (existente) throw new Error('EMAIL_JA_CADASTRADO');

    const senha_hash = await bcrypt.hash(senha, 10);
    return await prisma.admins_namorados.create({ data: { nome, email, senha_hash } });
  }

  async authenticateAdmin(email, senha) {
    const admin = await prisma.admins_namorados.findUnique({ where: { email } });
    if (!admin) throw new Error('ADMIN_NAO_ENCONTRADO');

    const ok = await bcrypt.compare(senha, admin.senha_hash);
    if (!ok) throw new Error('SENHA_INVALIDA');

    const token = jwt.sign({ adminId: admin.id }, JWT_SECRET, { expiresIn: '8h' });
    return token;
  }

  async getAdminById(id) {
    return await prisma.admins_namorados.findUnique({ where: { id } });
  }

  // --- NOVOS MÉTODOS PARA O PAINEL DE CONTROLE ---

  async listarReservas() {
    return await prisma.namorados_reservas.findMany({
      include: {
        cliente: true,
        mesa: true,
        integrantes: {
          include: {
            principal: true,
            sobremesa: true
          }
        }
      },
      orderBy: { criado_em: 'desc' }
    });
  }

  async buscarReservas(busca = '') {
    const termo = busca.trim();
    return await prisma.namorados_reservas.findMany({
      where: {
        OR: [
          { token_voucher: { contains: termo } },
          { cliente: { nome_completo: { contains: termo } } },
          { cliente: { email: { contains: termo } } },
          { cliente: { whatsapp: { contains: termo } } },
          { integrantes: { some: { nome_integrante: { contains: termo } } } }
        ]
      },
      include: {
        cliente: true,
        mesa: true,
        integrantes: {
          include: {
            principal: true,
            sobremesa: true
          }
        }
      },
      orderBy: { criado_em: 'desc' }
    });
  }

  async atualizarValorReserva(id, valor) {
    return await prisma.namorados_reservas.update({
      where: { id },
      data: { valor_total: valor }
    });
  }

  async obterMesasAdmin(horario_slot) {
    const mesas = await prisma.namorados_mesas.findMany({
      where: { horario_slot },
      include: {
        reservas: {
          include: {
            cliente: true,
            integrantes: true
          },
          orderBy: { criado_em: 'desc' }
        }
      }
    });

    return mesas.map(mesa => {
      const activeRes = mesa.reservas.find(r => !r.finalizada) || mesa.reservas[0];
      let status = 'Aguardando';
      let name = 'Mesa Disponível';
      let time = '';
      let footer = 'LIVRE';
      let highlight = false;

      if (mesa.status === 'bloqueada') {
        status = 'Aguardando';
        name = 'Bloqueada Temporariamente';
        footer = 'BLOQUEADA';
      } else if (activeRes && mesa.status === 'reservada' && activeRes.status_pagamento === 'pago') {
        if (activeRes.finalizada) {
          status = 'Finalizada';
          name = activeRes.integrantes.length > 0 
            ? activeRes.integrantes.map(i => i.nome_integrante.split(' ')[0]).join(' & ') 
            : activeRes.cliente.nome_completo;
          time = activeRes.data_check_in 
            ? new Date(activeRes.data_check_in).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) 
            : '';
          footer = 'LIMPEZA PENDENTE';
        } else if (activeRes.check_in_realizado) {
          status = 'Ocupada';
          name = activeRes.integrantes.length > 0 
            ? activeRes.integrantes.map(i => i.nome_integrante.split(' ')[0]).join(' & ') 
            : activeRes.cliente.nome_completo;
          time = activeRes.data_check_in 
            ? new Date(activeRes.data_check_in).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) 
            : '';
          footer = 'SOBREMESA'; // status do fluxo simulado
          highlight = true;
        } else {
          status = 'Aguardando';
          name = activeRes.integrantes.length > 0 
            ? activeRes.integrantes.map(i => i.nome_integrante.split(' ')[0]).join(' & ') 
            : activeRes.cliente.nome_completo;
          time = mesa.horario_slot;
          footer = 'RESERVADO';
        }
      }

      return {
        id: mesa.id,
        numero_mesa: mesa.numero_mesa,
        andar: mesa.andar,
        status,
        name,
        time,
        footer,
        highlight,
        loading: false,
        size: 'normal'
      };
    });
  }

  async obterDetalhesMesa(mesaId, horario_slot) {
    const mesa = await prisma.namorados_mesas.findFirst({
      where: { id: mesaId },
      include: {
        reservas: {
          include: {
            cliente: true,
            entrada: true,
            integrantes: {
              include: {
                principal: true,
                sobremesa: true
              }
            },
            bebidas_intencao: {
              include: {
                bebida: true
              }
            }
          },
          orderBy: { criado_em: 'desc' },
          take: 1
        }
      }
    });

    if (!mesa || mesa.reservas.length === 0) return null;

    const res = mesa.reservas[0];
    if (mesa.status !== 'reservada' || res.status_pagamento !== 'pago') return null;
    const coupleName = res.integrantes.length > 0
      ? res.integrantes.map(i => i.nome_integrante).join(' & ')
      : res.cliente.nome_completo;

    const timeline = [
      { time: new Date(res.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), text: 'Reserva criada pelo sistema.' }
    ];
    if (res.data_check_in) {
      timeline.unshift({
        time: new Date(res.data_check_in).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        text: 'Check-in realizado com sucesso.'
      });
    }
    if (res.finalizada) {
      timeline.unshift({
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        text: 'Experiência finalizada.'
      });
    }

    return {
      coupleName,
      photo: res.foto_url || '/img/copo-perfiil.png',
      category: mesa.andar === 0 ? 'Mesa Térreo' : 'Mesa Mezanino',
      guests: `${res.integrantes.length || 2} Pessoas`,
      arrival: res.check_in_realizado ? `Chegou às ${new Date(res.data_check_in).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Aguardando',
      hasHeart: res.integrantes.length === 2,
      order: {
        entrada: res.entrada.nome,
        pratos: res.integrantes.map(i => ({ name: i.principal.nome, tag: i.nome_integrante.split(' ')[0] })),
        sobremesa: res.integrantes.map(i => i.sobremesa.nome).join(' & ')
      },
      drinks: res.bebidas_intencao.map(b => ({
        name: b.bebida.nome,
        badge: b.quantidade > 1 ? `x${b.quantidade}` : b.tipo_consumo === 'garrafa' ? 'Garrafa' : 'Taça'
      })),
      specialRequest: res.observacoes || 'Nenhuma solicitação especial.',
      alertNote: res.status_pagamento === 'pago'
        ? 'Pagamento Confirmado'
        : (res.status_pagamento === 'recusado'
          ? 'Pagamento Recusado'
          : (res.status_pagamento === 'conflito_mesa'
            ? 'Conflito de Mesa (Ação Requerida)'
            : 'Pagamento Pendente')),
      timeline
    };
  }

  async atualizarStatusMesa(mesaId, status, horario_slot) {
    const latestRes = await prisma.namorados_reservas.findFirst({
      where: { mesa_id: mesaId, finalizada: false },
      orderBy: { criado_em: 'desc' }
    });

    if (status === 'Livre') {
      await prisma.namorados_mesas.update({
        where: { id: mesaId },
        data: { status: 'disponivel', sessao_bloqueio: null, bloqueada_ate: null }
      });
      if (latestRes) {
        await prisma.namorados_reservas.update({
          where: { id: latestRes.id },
          data: { finalizada: true }
        });
      }
      return { sucesso: true };
    }

    if (latestRes) {
      if (status === 'Finalizada') {
        await prisma.namorados_reservas.update({
          where: { id: latestRes.id },
          data: { finalizada: true }
        });
      } else if (status === 'Ocupada') {
        await prisma.namorados_reservas.update({
          where: { id: latestRes.id },
          data: { check_in_realizado: true, data_check_in: new Date(), finalizada: false, status_pagamento: 'pago' }
        });
      } else if (status === 'Aguardando') {
        await prisma.namorados_reservas.update({
          where: { id: latestRes.id },
          data: { check_in_realizado: false, data_check_in: null, finalizada: false, status_pagamento: 'pago' }
        });
      }
    }

    let dbStatus = 'reservada';
    if (status === 'Finalizada' || status === 'Livre') {
      dbStatus = 'disponivel';
    }
    await prisma.namorados_mesas.update({
      where: { id: mesaId },
      data: { status: dbStatus }
    });

    return { sucesso: true };
  }
}
