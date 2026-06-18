const Proposta      = require('../models/Proposta');
const Candidatura   = require('../models/Candidatura');
const Estudante     = require('../models/Estudante');
const Notificacao   = require('../models/Notificacao');
const Utilizador    = require('../models/Utilizador');
const AprovacaoCCA  = require('../models/AprovacaoCCA');

// GET /api/propostas
exports.listar = async (req, res) => {
  try {
    const { tipo, area, empresa, pesquisa } = req.query;
    const filtro = {};

    // Estudantes só vêem propostas aprovadas do seu curso
    if (req.utilizador.perfil === 'estudante') {
      filtro.estado = 'aprovada';
      const estudante = await Estudante.findOne({ utilizadorId: req.utilizador._id });
      if (estudante) filtro.curso = estudante.curso;
    }

    // Docentes e entidades vêem só as suas próprias propostas
    if (['docente','entidade'].includes(req.utilizador.perfil)) {
      if (req.query.orientador === 'me') {
        // Propostas onde é tutor atribuído
        filtro.orientadorId = req.utilizador._id;
        delete filtro.proponenteId;
      } else {
        filtro.proponenteId = req.utilizador._id;
      }
    }

    if (tipo)    filtro.tipo  = tipo;
    if (area)    filtro.areas = area;
    if (empresa) filtro.nomeEntidade = { $regex: empresa, $options: 'i' };
    if (pesquisa) filtro.$text = { $search: pesquisa };

    const propostas = await Proposta.find(filtro)
      .populate('proponenteId', 'nome email perfil')
      .sort({ criadaEm: -1 })
      .limit(50);

    res.json({ sucesso: true, total: propostas.length, propostas });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// GET /api/propostas/stats — estatísticas para o dashboard do estudante
exports.statsEstudante = async (req, res) => {
  try {
    const estudante = await Estudante.findOne({ utilizadorId: req.utilizador._id });
    if (!estudante) return res.status(404).json({ sucesso: false, mensagem: 'Perfil não encontrado.' });

    const totalDisponiveis = await Proposta.countDocuments({
      estado: 'aprovada',
      curso:  estudante.curso
    });

    const candidaturas = await Candidatura.find({ estudanteId: estudante._id })
      .populate('propostaId', 'titulo tipo nomeEntidade estado criadaEm');

    const totalCandidaturas    = candidaturas.length;
    const entrevistasAgendadas = candidaturas.filter(c => c.estado === 'entrevista_agendada').length;
    const aceite               = candidaturas.filter(c => c.estado === 'aceite').length;

    // Propostas recentes (aprovadas do curso + candidaturas)
    const propostasRecentes = await Proposta.find({
      estado: 'aprovada',
      curso:  estudante.curso
    }).sort({ criadaEm: -1 }).limit(5);

    res.json({
      sucesso: true,
      stats: { totalDisponiveis, totalCandidaturas, entrevistasAgendadas, aceite },
      candidaturas,
      propostasRecentes
    });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// GET /api/propostas/:id
exports.obter = async (req, res) => {
  try {
    const proposta = await Proposta.findById(req.params.id)
      .populate('proponenteId', 'nome email perfil');
    if (!proposta) return res.status(404).json({ sucesso: false, mensagem: 'Proposta não encontrada.' });
    res.json({ sucesso: true, proposta });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// POST /api/propostas
exports.criar = async (req, res) => {
  try {
    // Se quem submete é um docente, é automaticamente orientador da proposta.
    // Não há necessidade de a CCA fazer a atribuição manualmente depois.
    const eDocente = req.utilizador.perfil === 'docente';

    const proposta = await Proposta.create({
      ...req.body,
      proponenteId:   req.utilizador._id,
      tipoProponente: req.utilizador.perfil,
      estado:         eDocente ? 'aprovada' : 'pendente',
      orientadorId:   eDocente ? req.utilizador._id : undefined
    });

    // Notificar membros da CCA
    const Notificacao = require('../models/Notificacao');
    const membros = await Utilizador.find({ perfil: 'comissao', ativo: true });
    if (membros.length) {
      const tipoNotif = eDocente ? 'proposta_aprovada' : 'nova_proposta';
      const msgNotif  = eDocente
        ? `O docente ${req.utilizador.nome} submeteu e ficou automaticamente como orientador da proposta "${proposta.titulo}".`
        : `Nova proposta submetida: "${proposta.titulo}"`;
      await Notificacao.insertMany(membros.map(m => ({
        destinatarioId: m._id,
        tipo:           tipoNotif,
        mensagem:       msgNotif,
        referenciaId:   proposta._id
      })));
    }

    res.status(201).json({ sucesso: true, proposta });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// POST /api/propostas/:id/interesse — manifestar interesse
exports.manifestarInteresse = async (req, res) => {
  try {
    const estudante = await Estudante.findOne({ utilizadorId: req.utilizador._id });
    if (!estudante) return res.status(400).json({ sucesso: false, mensagem: 'Perfil de estudante não encontrado.' });

    const proposta = await Proposta.findById(req.params.id);
    if (!proposta || proposta.estado !== 'aprovada')
      return res.status(400).json({ sucesso: false, mensagem: 'Proposta não disponível.' });

    const jaExiste = await Candidatura.findOne({ propostaId: proposta._id, estudanteId: estudante._id });
    if (jaExiste) return res.status(400).json({ sucesso: false, mensagem: 'Já manifestaste interesse nesta proposta.' });

    const candidatura = await Candidatura.create({
      propostaId:  proposta._id,
      estudanteId: estudante._id
    });

    res.status(201).json({ sucesso: true, candidatura });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// PUT /api/propostas/:id — entidade edita proposta rejeitada
exports.editarProposta = async (req, res) => {
  try {
    const proposta = await Proposta.findById(req.params.id);
    if (!proposta) return res.status(404).json({ sucesso: false, mensagem: 'Proposta não encontrada.' });

    // Apenas o proponente pode editar
    if (proposta.proponenteId.toString() !== req.utilizador._id.toString()) {
      return res.status(403).json({ sucesso: false, mensagem: 'Sem permissão para editar esta proposta.' });
    }

    // Só pode editar se estiver rejeitada
    if (proposta.estado !== 'rejeitada') {
      return res.status(400).json({ sucesso: false, mensagem: 'Só é possível editar propostas rejeitadas.' });
    }

    // Atualizar todos os campos enviados
    const campos = ['titulo','tipo','areas','descricao','objetivos','resultadosEsperados',
      'planoTrabalho','perfilCandidato','plugIN','nomeEntidade','emailContacto',
      'moradaEntidade','moradaLocalEstagio','tutorNome','tutorEmail','tutorCargo'];

    // Guardar snapshot antes de editar (para mostrar alterações à CCA)
    proposta.versaoAnterior = {};
    campos.forEach(c => { proposta.versaoAnterior[c] = proposta[c]; });

    campos.forEach(c => { if (req.body[c] !== undefined) proposta[c] = req.body[c]; });

    // Repõe como pendente e limpa feedback anterior
    proposta.estado      = 'pendente';
    proposta.feedbackCCA = null;
    proposta.sugestaoCCA = null;
    await proposta.save();

    // Limpar votos antigos para que a CCA possa votar de novo
    await AprovacaoCCA.deleteMany({ propostaId: proposta._id });

    // Notificar membros da CCA (isolado para não afetar a resposta)
    try {
      const membros = await Utilizador.find({ perfil: { $in: ['comissao','admin'] } });
      if (membros.length) {
        await Notificacao.insertMany(membros.map(m => ({
          destinatarioId: m._id,
          tipo: 'proposta_editada',
          mensagem: `A proposta "${proposta.titulo}" foi editada e resubmetida para aprovação.`,
          referenciaId: proposta._id
        })));
      }
    } catch { /* notificação opcional — não bloqueia */ }

    res.json({ sucesso: true, proposta });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// GET /api/propostas/:id — obter proposta individual
exports.obterProposta = async (req, res) => {
  try {
    const proposta = await Proposta.findById(req.params.id)
      .populate('proponenteId', 'nome email');
    if (!proposta) return res.status(404).json({ sucesso: false, mensagem: 'Proposta não encontrada.' });
    res.json({ sucesso: true, proposta });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// GET /api/propostas/minhas-tutorias
// Propostas onde o docente autenticado é o orientador atribuído
exports.minhasTutorias = async (req, res) => {
  try {
    const propostas = await Proposta.find({ orientadorId: req.utilizador._id })
      .populate('proponenteId', 'nome email')
      .sort({ atualizadaEm: -1 });

    // Para cada proposta, buscar o estudante aceite (se existir)
    const propostasComEstudante = await Promise.all(propostas.map(async p => {
      const Candidatura = require('../models/Candidatura');
      const candAceite = await Candidatura.findOne({ propostaId: p._id, estado: 'aceite' })
        .populate('estudanteId', 'nome email');
      return {
        ...p.toObject(),
        estudanteAceite: candAceite?.estudanteId || null,
        totalCandidatos: await Candidatura.countDocuments({ propostaId: p._id })
      };
    }));

    res.json({ sucesso: true, total: propostas.length, propostas: propostasComEstudante });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};