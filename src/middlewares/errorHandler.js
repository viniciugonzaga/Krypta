// Handlers globais: nunca vazar stack trace nem HTML do Express para o cliente.
const naoEncontrado = (req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
};

// eslint-disable-next-line no-unused-vars
const erroGlobal = (err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON malformado.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ erro: 'Corpo da requisição grande demais.' });
  }
  console.error('Erro não tratado:', err);
  return res.status(500).json({ erro: 'Erro interno no servidor.' });
};

module.exports = { naoEncontrado, erroGlobal };
