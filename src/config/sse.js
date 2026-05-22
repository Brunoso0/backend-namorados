let clientesPainelAdmin = [];

export const adicionarClientePainel = (res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  clientesPainelAdmin.push(res);

  return () => {
    clientesPainelAdmin = clientesPainelAdmin.filter(cliente => cliente !== res);
  };
};

export const emitirCheckInParaOPainel = (dadosCasal) => {
  clientesPainelAdmin.forEach(cliente => {
    cliente.write(`data: ${JSON.stringify(dadosCasal)}\n\n`);
  });
};