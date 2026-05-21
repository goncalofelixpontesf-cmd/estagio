const Utilizador = require('../models/Utilizador');
const Estudante  = require('../models/Estudante');
const Entidade   = require('../models/Entidade');
const path       = require('path');
const fs         = require('fs');

// GET /api/utilizadores/perfil
exports.obterPerfil = async (req, res) => {
  try {
    const utilizador = await Utilizador.findById(req.utilizador._id);
    let dadosExtra = null;
    if (utilizador.perfil === 'estudante') {
      dadosExtra = await Estudante.findOne({ utilizadorId: utilizador._id })
        .populate('propostaEscolhidaId', 'titulo');
    } else if (utilizador.perfil === 'entidade') {
      dadosExtra = await Entidade.findOne({ utilizadorId: utilizador._id });
    }
    res.json({ sucesso: true, utilizador, dadosExtra });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// PUT /api/utilizadores/perfil
exports.editarPerfil = async (req, res) => {
  try {
    const { nome, telefone, linkedin, portfolio } = req.body;

    if (nome) {
      await Utilizador.findByIdAndUpdate(req.utilizador._id, { nome });
    }

    if (req.utilizador.perfil === 'estudante') {
      await Estudante.findOneAndUpdate(
        { utilizadorId: req.utilizador._id },
        { ...(telefone !== undefined && { telefone }),
          ...(linkedin  !== undefined && { linkedin  }),
          ...(portfolio !== undefined && { portfolio }) },
        { new: true }
      );
    }

    const utilizador = await Utilizador.findById(req.utilizador._id);
    const dadosExtra = await Estudante.findOne({ utilizadorId: utilizador._id })
      .populate('propostaEscolhidaId', 'titulo');

    res.json({ sucesso: true, utilizador, dadosExtra });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// POST /api/utilizadores/cv
exports.uploadCV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ sucesso: false, mensagem: 'Nenhum ficheiro recebido.' });
    }

    const estudante = await Estudante.findOne({ utilizadorId: req.utilizador._id });
    if (!estudante) {
      return res.status(404).json({ sucesso: false, mensagem: 'Perfil de estudante não encontrado.' });
    }

    // Apagar CV anterior se existir
    if (estudante.cv) {
      const caminhoAntigo = path.join(__dirname, '..', 'uploads', estudante.cv);
      if (fs.existsSync(caminhoAntigo)) fs.unlinkSync(caminhoAntigo);
    }

    estudante.cv = req.file.filename;
    await estudante.save();

    res.json({
      sucesso: true,
      cv: req.file.filename,
      cvUrl: `/uploads/${req.file.filename}`,
      mensagem: 'CV guardado com sucesso.'
    });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};  