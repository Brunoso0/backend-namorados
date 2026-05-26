# Fluxo de Reserva — Backend Namorados

## Objetivo
Descrever o fluxo real de reserva no backend: quais tabelas são usadas, como buscar itens no banco (Prisma), e como devolver os dados via API.

## Modelos relevantes (Prisma)
- `namorados_cardapio` (itens do menu): `id, nome, descricao, tipo_item, preco_taca, preco_garrafa, estoque_disponivel, ativo`
- `namorados_mesas` (mesas): `id, numero_mesa, andar, capacidade_maxima, horario_slot, status, bloqueada_ate, sessao_bloqueio`
- `namorados_reservas` (reservas): `id, cliente_id, mesa_id, entrada_cardapio_id, token_voucher, valor_total, check_in_realizado, finalizada, criado_em`
- `namorados_reserva_integrantes` (pratos por convidado)
- `namorados_reserva_bebidas` (intenção de bebidas)

## Resumo do fluxo
1. Listar itens do cardápio (para montar interface) — `GET /evento/cardapio`.
2. Listar mesas por `horario_slot` — `GET /evento/mesas?horario_slot=slot_19_00`.
3. Bloquear mesa temporariamente (sessão cliente) — `POST /evento/mesas/bloquear`.
4. Criar reserva completa — `POST /evento/reservas` (transação): gravar cliente, reserva, integrantes, bebidas e marcar mesa como `reservada`.
5. Check-in — `POST /evento/checkin` com `token_voucher`.

## Endpoints e queries (exemplos)
Todos os exemplos usam o client Prisma importado como `prisma` (veja `src/config/prisma.js`).

### 1) Listar cardápio
- Rota: `GET /evento/cardapio`
- Query Prisma:

```js
const itens = await prisma.namorados_cardapio.findMany({ where: { ativo: true } });
const cardapio = {
  entradas: itens.filter(i => i.tipo_item === 'entrada'),
  principais: itens.filter(i => i.tipo_item === 'principal'),
  sobremesas: itens.filter(i => i.tipo_item === 'sobremesa'),
  bebidas: itens.filter(i => i.tipo_item === 'bebida'),
};
return cardapio;
```
- Response (200):
```json
{
  "entradas": [ ... ],
  "principais": [ ... ],
  "sobremesas": [ ... ],
  "bebidas": [ ... ]
}
```

---

### 2) Listar mesas por horário
- Rota: `GET /evento/mesas?horario_slot=slot_19_00`
- Query Prisma:

```js
const mesas = await prisma.namorados_mesas.findMany({ where: { horario_slot } });
return mesas;
```
 - Observações: o `horario_slot` é enum (`slot_19_00`, `slot_21_00`). A seed já cria 28 mesas (1–28) por slot; mesa 18 tem `capacidade_maxima: 10`, as demais 2.
 - Observações: o `horario_slot` é enum (`slot_19_00`, `slot_21_00`). O `src/seed.js` cria 29 mesas (1–18 no térreo, 19–29 no andar 1) por slot; mesa 18 tem `capacidade_maxima: 10`, as demais 2.
- Response (200):
```json
{
  "horario_slot": "slot_19_00",
  "mesas": [
    { "id": 1, "numero_mesa": 1, "andar": 0, "capacidade_maxima": 2, "status": "disponivel" },
    ...
  ]
}
```

---

### 3) Bloquear mesa (temporário)
- Rota: `POST /evento/mesas/bloquear`
- Body: `{ mesa_id, sessao_bloqueio }`
- Lógica (Prisma dentro de transação):
  - `findUnique` por `id`.
  - Validar se existe; se `status === 'reservada'` lançar `MESA_JA_RESERVADA`.
  - Se `status === 'bloqueada'` e `sessao_bloqueio` diferente e `bloqueada_ate` no futuro, lançar `MESA_OCUPADA_TEMPORARIAMENTE`.
  - Atualizar `status: 'bloqueada'`, `sessao_bloqueio`, `bloqueada_ate = agora + 30min`.

- Query Prisma (exemplo simplificado):

```js
await prisma.$transaction(async (tx) => {
  const mesa = await tx.namorados_mesas.findUnique({ where: { id: mesaId } });
  // validações...
  return await tx.namorados_mesas.update({ where: { id: mesaId }, data: { status: 'bloqueada', sessao_bloqueio: sessao, bloqueada_ate: novaData } });
});
```
- Respostas:
  - 200 `{ sucesso: true, bloqueada_ate: '2024-02-14T19:30:00Z' }`
  - 409 quando `MESA_JA_RESERVADA` ou `MESA_OCUPADA_TEMPORARIAMENTE`.

---

### 4) Criar reserva completa (fluxo principal)
- Rota: `POST /evento/reservas`
- Body: ex.:
```json
{
  "cliente": { "nome_completo": "Fulano", "email": "f@e.com", "whatsapp": "71999999999" },
  "mesa_id": 5,
  "sessao_bloqueio": "sessao-abc",
  "entrada_cardapio_id": 3,
  "integrantes": [ { "nome_integrante": "A", "principal_cardapio_id": 4, "sobremesa_cardapio_id": 6 } ],
  "bebidas_intencao": [ { "bebida_cardapio_id": 8, "tipo_consumo": "taca", "quantidade": 1 } ]
}
```

- Lógica (implementada em `EventoService.criarReservaCompleta`):
  1. Buscar mesa por `id` (findUnique) e validar disponibilidade: se não existir, `MESA_INDISPONIVEL`; se `status === 'reservada'` ou `status === 'bloqueada'` por outra sessão, `MESA_INDISPONIVEL`.
  2. Gerar `token_voucher` e `valor_total`.
  3. Em transação:
     - `upsert` do cliente (por `email`).
     - `create` em `namorados_reservas` (client id, mesa_id, entrada_cardapio_id, observacoes, valor_total, token_voucher).
     - `createMany` em `namorados_reserva_integrantes` (se houver).
     - `createMany` em `namorados_reserva_bebidas` (se houver).
     - `update` da mesa: `status: 'reservada', sessao_bloqueio: null, bloqueada_ate: null`.
  4. Gerar QR code do `token_voucher` e retornar dados.

- Query Prisma (resumo):

```js
await prisma.$transaction(async (tx) => {
  const dbCliente = await tx.namorados_clientes.upsert({ where: { email: cliente.email }, update: { ... }, create: { ... } });

  const novaReserva = await tx.namorados_reservas.create({ data: { cliente_id: dbCliente.id, mesa_id, entrada_cardapio_id, valor_total, token_voucher } });

  if (integrantes?.length) await tx.namorados_reserva_integrantes.createMany({ data: ... });
  if (bebidas_intencao?.length) await tx.namorados_reserva_bebidas.createMany({ data: ... });

  await tx.namorados_mesas.update({ where: { id: mesa_id }, data: { status: 'reservada', sessao_bloqueio: null, bloqueada_ate: null } });

  return novaReserva;
});
```

- Response (201):
```json
{
  "sucesso": true,
  "reserva_id": 123,
  "token_voucher": "VCH-XXXX-9999",
  "qr_code": "data:image/png;base64,...",
  "valor_total": 480.00,
  "pagamento": { "metodo": "PIX", "pix_copia_e_cola": "codigo_gerado_aqui..." }
}
```
- Erros:
  - 409 `MESA_INDISPONIVEL`
  - 500 outros erros do servidor

---

### 5) Check-in
- Rota: `POST /evento/checkin` com `{ token_voucher }`.
- Lógica:
  - `findUnique` por `token_voucher` incluindo `cliente`, `mesa`, `integrantes`.
  - Se não existir: `VOUCHER_NAO_ENCONTRADO` (404).
  - Se `check_in_realizado === true` lançar `CHECKIN_JA_REALIZADO`.
  - `update` em `namorados_reservas` setando `check_in_realizado: true` e `data_check_in`.
  - Retornar: `mesa.numero_mesa`, `horario`, `nome_cliente`, `integrantes` com seus pratos.

- Exemplo de resposta (200):
```json
{
  "sucesso": true,
  "mensagem": "Entrada autorizada!",
  "dados": {
    "mesa": 5,
    "horario": "slot_19_00",
    "nome_cliente": "Fulano",
    "observacoes": "",
    "integrantes": [ { "nome": "A", "prato": "Risoto de Cogumelos" } ]
  }
}
```

## População inicial (seed)

- Observação: o script de seed foi removido do repositório para evitar recriações acidentais das mesas em ambientes com dados existentes.
- Se precisar repopular dados em um ambiente de desenvolvimento limpo, cree um script temporário que insira apenas os registros necessários ou utilize migrações SQL controladas.
- Para inspeção manual das tabelas use:

```bash
npx prisma studio
node src/check-db.js
```

## Verificação rápida
- `node src/check-db.js` mostra contagem e exemplo de mesa.
- `npx prisma studio` permite editar tabelas manualmente.

## Boas práticas e notas
- Sempre usar transações ao criar reserva para manter consistência entre mesas e reservas.
- Validar concorrência: bloquear mesa antes de criar a reserva (fluxo UI deve pedir bloqueio e enviar a mesma `sessao_bloqueio` ao criar a reserva).
- Tratar corretamente `bloqueada_ate` para liberar bloqueios expirados.
 - Garantir enum `HorarioSlot` esteja alinhado com a UI (use os valores `slot_19_00` e `slot_21_00`).

---

Arquivo gerado automaticamente com base nas implementações existentes do projeto.
