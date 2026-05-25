export const validateSchema = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    const detalhes = Array.isArray(error?.errors)
      ? error.errors.map(e => ({ campo: e.path ? e.path.join('.') : '', mensagem: e.message }))
      : [{ mensagem: error?.message || String(error) }];

    return res.status(400).json({
      sucesso: false,
      erro: 'DADOS_INVALIDOS',
      detalhes
    });
  }
};