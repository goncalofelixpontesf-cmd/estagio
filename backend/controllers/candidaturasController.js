const Candidatura = require('../models/Candidatura');
const Proposta    = require('../models/Proposta');
const Estudante   = require('../models/Estudante');
const Notificacao = require('../models/Notificacao');

// GET /api/candidaturas/proposta/:propostaId — candidatos de uma proposta
exports.candidatosDeProposta = async (req, res) => {
  try {
    const candidaturas = await Candidatura.find({ propostaId: req.params.propostaId })
      .populate({
        path: 'estudanteId',
        populate: { path: 'utilizadorId', select: 'nome email' }
      })
      .sort({ criadaEm: -1 });

    res.json({ sucesso: true, total: candidaturas.length, candidaturas });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// POST /api/candidaturas/:id/entrevista — agendar entrevista
exports.agendarEntrevista = async (req, res) => {
  try {
    const { dataEntrevista, localEntrevista } = req.body;
    if (!dataEntrevista || !localEntrevista) {
      return res.status(400).json({ sucesso: false, mensagem: 'Data e local são obrigatórios.' });
    }

    const candidatura = await Candidatura.findByIdAndUpdate(
      req.params.id,
      { estado: 'entrevista_agendada', dataEntrevista, localEntrevista },
      { new: true }
    ).populate({ path: 'estudanteId', populate: { path: 'utilizadorId', select: 'nome email _id' } });

    if (!candidatura) return res.status(404).json({ sucesso: false, mensagem: 'Candidatura não encontrada.' });

    const proposta = await Proposta.findById(candidatura.propostaId);
    const destId   = candidatura.estudanteId?.utilizadorId?._id;

    if (destId) {
      await Notificacao.create({
        destinatarioId: destId,
        tipo:    'entrevista_agendada',
        mensagem:`Tens uma entrevista agendada para "${proposta?.titulo}" em ${new Date(dataEntrevista).toLocaleDateString('pt-PT')}.`,
        referenciaId: proposta?._id
      });
    }

    res.json({ sucesso: true, candidatura });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// PUT /api/candidaturas/:id/aceitar — aceitar estudante
exports.aceitar = async (req, res) => {
  try {
    const candidatura = await Candidatura.findByIdAndUpdate(
      req.params.id,
      { estado: 'aceite' },
      { new: true }
    ).populate({ path: 'estudanteId', populate: { path: 'utilizadorId', select: 'nome email _id' } });

    if (!candidatura) return res.status(404).json({ sucesso: false, mensagem: 'Candidatura não encontrada.' });

    // Actualizar proposta com o estudante aceite
    const proposta = await Proposta.findByIdAndUpdate(
      candidatura.propostaId,
      { estudanteId: candidatura.estudanteId._id },
      { new: true }
    );

    // Rejeitar as outras candidaturas
    await Candidatura.updateMany(
      { propostaId: candidatura.propostaId, _id: { $ne: candidatura._id } },
      { estado: 'rejeitada' }
    );

    const destId = candidatura.estudanteId?.utilizadorId?._id;
    if (destId) {
      await Notificacao.create({
        destinatarioId: destId,
        tipo:    'candidatura_aceite',
        mensagem:`Foste aceite na proposta "${proposta?.titulo}". Parabéns!`,
        referenciaId: proposta?._id
      });
    }

    res.json({ sucesso: true, candidatura });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// PUT /api/candidaturas/:id/rejeitar
exports.rejeitar = async (req, res) => {
  try {
    const candidatura = await Candidatura.findByIdAndUpdate(
      req.params.id,
      { estado: 'rejeitada', notaEntidade: req.body.nota },
      { new: true }
    ).populate({ path: 'estudanteId', populate: { path: 'utilizadorId', select: 'nome _id' } });

    if (!candidatura) return res.status(404).json({ sucesso: false, mensagem: 'Candidatura não encontrada.' });

    const proposta = await Proposta.findById(candidatura.propostaId);
    const destId   = candidatura.estudanteId?.utilizadorId?._id;
    if (destId) {
      await Notificacao.create({
        destinatarioId: destId,
        tipo:    'candidatura_rejeitada',
        mensagem:`A tua candidatura a "${proposta?.titulo}" não foi aceite.`,
        referenciaId: proposta?._id
      });
    }

    res.json({ sucesso: true, candidatura });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};
