const jwt = require('jsonwebtoken');
const Utilizador = require('../models/Utilizador');

exports.proteger = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ sucesso: false, mensagem: 'Nao autorizado.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.utilizador = await Utilizador.findById(decoded.id);
    if (!req.utilizador || !req.utilizador.ativo) {
      return res.status(401).json({ sucesso: false, mensagem: 'Utilizador nao encontrado.' });
    }
    next();
  } catch {
    return res.status(401).json({ sucesso: false, mensagem: 'Token invalido.' });
  }
};

exports.restringir = (...perfis) => (req, res, next) => {
  if (!perfis.includes(req.utilizador.perfil)) {
    return res.status(403).json({ sucesso: false, mensagem: 'Sem permissao.' });
  }
  next();
};
