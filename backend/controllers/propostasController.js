const Proposta    = require('../models/Proposta');
const Candidatura = require('../models/Candidatura');
const Estudante   = require('../models/Estudante');
const Notificacao = require('../models/Notificacao');
const Utilizador  = require('../models/Utilizador');

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
      filtro.proponenteId = req.utilizador._id;
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
    const proposta = await Proposta.create({
      ...req.body,
      proponenteId:   req.utilizador._id,
      tipoProponente: req.utilizador.perfil,
      estado: 'pendente'
    });

    // Notificar membros da CCA
    const membros = await Utilizador.find({ perfil: 'comissao', ativo: true });
    if (membros.length) {
      const Notificacao = require('../models/Notificacao');
      await Notificacao.insertMany(membros.map(m => ({
        destinatarioId: m._id,
        tipo: 'nova_proposta',
        mensagem: `Nova proposta submetida: "${proposta.titulo}"`,
        referenciaId: proposta._id
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