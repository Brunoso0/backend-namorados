import { z } from 'zod';

export const reservaSchema = z.object({
  cliente: z.object({
    nome_completo: z.string().min(3, 'Nome é obrigatório'),
    email: z.string().email('E-mail inválido'),
    whatsapp: z.string().min(10, 'WhatsApp inválido')
  }),
  mesa_id: z.number().int(),
  sessao_bloqueio: z.string().uuid('Sessão inválida'),
  entrada_cardapio_id: z.number().int(),
  observacoes: z.string().optional().nullable(),
  foto_url: z.string().url().optional().nullable(),
  integrantes: z.array(z.object({
    nome_integrante: z.string().min(2),
    principal_cardapio_id: z.number().int(),
    sobremesa_cardapio_id: z.number().int(),
    alergias: z.string().optional().nullable()
  })).min(1, 'A reserva precisa ter pelo menos um integrante'),
  bebidas_intencao: z.array(z.object({
    bebida_cardapio_id: z.number().int(),
    tipo_consumo: z.enum(['garrafa', 'taca']),
    quantidade: z.number().int().min(1)
  })).optional()
});