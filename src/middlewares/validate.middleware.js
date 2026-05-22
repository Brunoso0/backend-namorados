export const validateSchema = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      sucesso: false,
      erro: 'DADOS_INVALIDOS',
      detalhes: error.errors.map(e => ({ campo: e.path.join('.'), mensagem: e.message }))
    });
  }
};