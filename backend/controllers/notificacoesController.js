const Notificacao = require('../models/Notificacao');

// GET /api/notificacoes
exports.listar = async (req, res) => {
  try {
    const notificacoes = await Notificacao.find({ destinatarioId: req.utilizador._id })
      .sort({ enviadaEm: -1 })
      .limit(50);

    const naolidas = notificacoes.filter(n => !n.lida).length;

    res.json({ sucesso: true, naolidas, notificacoes });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// PUT /api/notificacoes/:id/lida
exports.marcarLida = async (req, res) => {
  try {
    await Notificacao.findByIdAndUpdate(req.params.id, { lida: true });
    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// PUT /api/notificacoes/lidas
exports.marcarTodasLidas = async (req, res) => {
  try {
    await Notificacao.updateMany(
      { destinatarioId: req.utilizador._id, lida: false },
      { lida: true }
    );
    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};