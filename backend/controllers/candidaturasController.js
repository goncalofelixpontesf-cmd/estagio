const Candidatura = require('../models/Candidatura');
const Proposta    = require('../models/Proposta');
const Estudante   = require('../models/Estudante');
const Notificacao = require('../models/Notificacao');

// GET /api/candidaturas/minhas
exports.minhas = async (req, res) => {
  try {
    const estudante = await Estudante.findOne({ utilizadorId: req.utilizador._id });
    if (!estudante) return res.json({ sucesso: true, total: 0, candidaturas: [] });

    const candidaturas = await Candidatura.find({ estudanteId: estudante._id })
      .populate({ path: 'propostaId', select: 'titulo tipo curso nomeEntidade tutorNome tutorEmail estado' })
      .sort({ criadaEm: -1 });

    res.json({ sucesso: true, total: candidaturas.length, candidaturas });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// GET /api/candidaturas/proposta/:propostaId
exports.candidatosDeProposta = async (req, res) => {
  try {
    const candidaturas = await Candidatura.find({ propostaId: req.params.propostaId })
      .populate({ path: 'estudanteId', populate: { path: 'utilizadorId', select: 'nome email' } })
      .sort({ criadaEm: -1 });

    res.json({ sucesso: true, total: candidaturas.length, candidaturas });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// POST /api/candidaturas/:propostaId
exports.manifestarInteresse = async (req, res) => {
  try {
    const estudante = await Estudante.findOne({ utilizadorId: req.utilizador._id });
    if (!estudante) return res.status(404).json({ sucesso: false, mensagem: 'Perfil de estudante não encontrado.' });

    const proposta = await Proposta.findById(req.params.propostaId);
    if (!proposta) return res.status(404).json({ sucesso: false, mensagem: 'Proposta não encontrada.' });
    if (!['aprovada', 'atribuida'].includes(proposta.estado)) return res.status(400).json({ sucesso: false, mensagem: 'Só é possível candidatar a propostas aprovadas.' });

    const jaExiste = await Candidatura.findOne({ propostaId: proposta._id, estudanteId: estudante._id });
    if (jaExiste) return res.status(400).json({ sucesso: false, mensagem: 'Já te candidataste a esta proposta.' });

    // Bloquear se o estudante já tem uma candidatura confirmada noutras propostas
    const jaConfirmada = await Candidatura.findOne({ estudanteId: estudante._id, estado: 'confirmada' });
    if (jaConfirmada) return res.status(400).json({ sucesso: false, mensagem: 'Já foi selecionado para um estágio. Não é possível manifestar interesse em novas propostas.' });

    // Verificar se o estudante é o proponente da proposta
    const eProponente = proposta.proponenteId?.toString() === req.utilizador._id.toString();

    const candidatura = await Candidatura.create({
      propostaId: proposta._id,
      estudanteId: estudante._id,
      // Se for o proponente, fica automaticamente confirmado
      estado: eProponente ? 'confirmada' : 'pendente'
    });

    if (eProponente) {
      // Marcar todas as outras candidaturas desta proposta como recusadas
      await Candidatura.updateMany(
        { propostaId: proposta._id, _id: { $ne: candidatura._id } },
        { estado: 'recusada' }
      );
      // Atualizar a proposta para atribuída com este estudante
      proposta.estado = 'atribuida';
      proposta.estudanteEscolhidoId = estudante._id;
      await proposta.save();
    } else {
      await Notificacao.create({
        destinatarioId: proposta.proponenteId,
        tipo: 'novo_interesse',
        mensagem: `Um estudante manifestou interesse na proposta "${proposta.titulo}".`,
        referenciaId: proposta._id
      });
    }

    res.status(201).json({ sucesso: true, candidatura, autoSelecionado: eProponente });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// PUT /api/candidaturas/:id/entrevista
exports.agendarEntrevista = async (req, res) => {
  try {
    const { dataEntrevista, localEntrevista } = req.body;
    if (!dataEntrevista || !localEntrevista) {
      return res.status(400).json({ sucesso: false, mensagem: 'Data e local são obrigatórios.' });
    }

    const candidatura = await Candidatura.findByIdAndUpdate(
      req.params.id,
      {
        estado: 'entrevista_agendada',
        dataEntrevista,
        localEntrevista,
        conhecimentoEntrevista: false,
        conhecimentoEm: null
      },
      { new: true }
    ).populate({ path: 'estudanteId', populate: { path: 'utilizadorId', select: 'nome _id' } });

    if (!candidatura) return res.status(404).json({ sucesso: false, mensagem: 'Candidatura não encontrada.' });

    await Notificacao.create({
      destinatarioId: candidatura.estudanteId?.utilizadorId?._id,
      tipo: 'entrevista_agendada',
      mensagem: `A tua entrevista foi agendada para ${new Date(dataEntrevista).toLocaleString('pt-PT')} — ${localEntrevista}.`,
      referenciaId: candidatura._id
    });

    res.json({ sucesso: true, candidatura });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// PUT /api/candidaturas/:id/conhecimento — estudante confirma que tomou conhecimento
exports.tomarConhecimento = async (req, res) => {
  try {
    const estudante = await Estudante.findOne({ utilizadorId: req.utilizador._id });
    if (!estudante) return res.status(404).json({ sucesso: false, mensagem: 'Perfil não encontrado.' });

    const candidatura = await Candidatura.findOne({
      _id: req.params.id,
      estudanteId: estudante._id
    }).populate('propostaId', 'titulo proponenteId');

    if (!candidatura) return res.status(404).json({ sucesso: false, mensagem: 'Candidatura não encontrada.' });
    if (candidatura.estado !== 'entrevista_agendada') {
      return res.status(400).json({ sucesso: false, mensagem: 'Não há entrevista agendada.' });
    }
    if (candidatura.conhecimentoEntrevista) {
      return res.status(400).json({ sucesso: false, mensagem: 'Já confirmaste o conhecimento desta entrevista.' });
    }

    candidatura.conhecimentoEntrevista = true;
    candidatura.conhecimentoEm = new Date();
    await candidatura.save();

    // Notificar o proponente
    await Notificacao.create({
      destinatarioId: candidatura.propostaId?.proponenteId,
      tipo: 'conhecimento_entrevista',
      mensagem: `O estudante tomou conhecimento da entrevista para "${candidatura.propostaId?.titulo}".`,
      referenciaId: candidatura._id
    });

    res.json({ sucesso: true, candidatura });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// PUT /api/candidaturas/:id/aceitar
exports.aceitar = async (req, res) => {
  try {
    const candidatura = await Candidatura.findByIdAndUpdate(
      req.params.id,
      { estado: 'aceite' },
      { new: true }
    ).populate({ path: 'estudanteId', populate: { path: 'utilizadorId', select: 'nome _id' } })
     .populate('propostaId', 'titulo');

    if (!candidatura) return res.status(404).json({ sucesso: false, mensagem: 'Candidatura não encontrada.' });

    await Candidatura.updateMany(
      { propostaId: candidatura.propostaId, _id: { $ne: candidatura._id }, estado: { $ne: 'aceite' } },
      { estado: 'rejeitada' }
    );

    await Notificacao.create({
      destinatarioId: candidatura.estudanteId?.utilizadorId?._id,
      tipo: 'candidatura_aceite',
      mensagem: `Foste selecionado para a proposta "${candidatura.propostaId?.titulo}"! Parabéns.`,
      referenciaId: candidatura.propostaId?._id
    });

    res.json({ sucesso: true, candidatura });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// PUT /api/candidaturas/:id/confirmar — estudante escolhe esta proposta entre as que foi aceite
exports.confirmar = async (req, res) => {
  try {
    const estudante = await Estudante.findOne({ utilizadorId: req.utilizador._id });
    if (!estudante) return res.status(404).json({ sucesso: false, mensagem: 'Perfil de estudante não encontrado.' });

    const candidatura = await Candidatura.findOne({ _id: req.params.id, estudanteId: estudante._id })
      .populate('propostaId', 'titulo proponenteId');

    if (!candidatura) return res.status(404).json({ sucesso: false, mensagem: 'Candidatura não encontrada.' });
    if (candidatura.estado !== 'aceite') {
      return res.status(400).json({ sucesso: false, mensagem: 'Só podes confirmar candidaturas em que foste aceite.' });
    }

    candidatura.estado = 'confirmada';
    await candidatura.save();

    await Notificacao.create({
      destinatarioId: candidatura.propostaId?.proponenteId,
      tipo: 'estagio_confirmado',
      mensagem: `O estudante confirmou que vai realizar o estágio na proposta "${candidatura.propostaId?.titulo}".`,
      referenciaId: candidatura.propostaId?._id
    });

    // Recusar automaticamente TODAS as outras candidaturas ainda activas do estudante
    // (pendentes, com entrevista agendada, ou outras em que também tinha sido aceite) —
    // uma vez confirmado o estágio, deixa de fazer sentido continuar nos outros processos.
    const outrasActivas = await Candidatura.find({
      estudanteId: estudante._id,
      _id: { $ne: candidatura._id },
      estado: { $in: ['pendente', 'entrevista_agendada', 'aceite'] }
    }).populate('propostaId', 'titulo proponenteId');

    for (const outra of outrasActivas) {
      outra.estado = 'recusada';
      await outra.save();
      await Notificacao.create({
        destinatarioId: outra.propostaId?.proponenteId,
        tipo: 'candidatura_recusada_estudante',
        mensagem: `O estudante já confirmou estágio noutra proposta — a candidatura para "${outra.propostaId?.titulo}" foi automaticamente cancelada.`,
        referenciaId: outra.propostaId?._id
      });
    }

    res.json({ sucesso: true, candidatura, recusadas: outrasActivas.length });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// PUT /api/candidaturas/:id/rejeitar
exports.rejeitar = async (req, res) => {
  try {
    const candidatura = await Candidatura.findByIdAndUpdate(
      req.params.id,
      { estado: 'rejeitada', feedback: req.body.feedback || null },
      { new: true }
    );
    if (!candidatura) return res.status(404).json({ sucesso: false, mensagem: 'Candidatura não encontrada.' });
    res.json({ sucesso: true, candidatura });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};