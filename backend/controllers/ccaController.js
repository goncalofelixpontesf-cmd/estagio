const Proposta     = require('../models/Proposta');
const AprovacaoCCA = require('../models/AprovacaoCCA');
const Utilizador   = require('../models/Utilizador');
const Notificacao  = require('../models/Notificacao');

// ── Helper: filtro de curso para o membro autenticado ──
function _filtroCurso(membro) {
  const cursos = membro.cursosCCA;
  // Se não tem cursos definidos (campo ausente ou array vazio), vê tudo
  if (!cursos || !Array.isArray(cursos) || cursos.length === 0) return {};
  return { curso: { $in: cursos } };
}

// ── Helper: membros da CCA com acesso a um curso específico ──
async function _membrosComAcesso(curso) {
  return Utilizador.find({
    perfil: 'comissao',
    ativo: true,
    $or: [
      { cursosCCA: curso },
      { cursosCCA: { $exists: false } },
      { cursosCCA: { $size: 0 } }
    ]
  });
}

// GET /api/cca/stats
exports.stats = async (req, res) => {
  try {
    const f = _filtroCurso(req.utilizador);
    const pendentes  = await Proposta.countDocuments({ estado: 'pendente',  ...f });
    const aprovadas  = await Proposta.countDocuments({ estado: 'aprovada',  ...f });
    const rejeitadas = await Proposta.countDocuments({ estado: 'rejeitada', ...f });
    res.json({ sucesso: true, stats: { pendentes, aprovadas, rejeitadas } });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// GET /api/cca/propostas/pendentes
exports.listarPendentes = async (req, res) => {
  try {
    const propostas = await Proposta.find({ estado: 'pendente', ..._filtroCurso(req.utilizador) })
      .populate('proponenteId', 'nome email perfil')
      .sort({ criadaEm: 1 });
    res.json({ sucesso: true, total: propostas.length, propostas });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// GET /api/cca/propostas
exports.listarTodas = async (req, res) => {
  try {
    const { estado } = req.query;
    const filtro = { ..._filtroCurso(req.utilizador) };
    if (estado) filtro.estado = estado;
    const propostas = await Proposta.find(filtro)
      .populate('proponenteId', 'nome email perfil')
      .sort({ criadaEm: -1 });
    res.json({ sucesso: true, total: propostas.length, propostas });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// POST /api/cca/propostas/:id/aprovar
exports.aprovar = async (req, res) => {
  try {
    const proposta = await Proposta.findById(req.params.id);
    if (!proposta) return res.status(404).json({ sucesso: false, mensagem: 'Proposta não encontrada.' });
    if (proposta.estado !== 'pendente') return res.status(400).json({ sucesso: false, mensagem: 'Proposta não está pendente.' });

    // Verificar se o membro tem acesso ao curso desta proposta
    const cursosM = req.utilizador.cursosCCA;
    if (cursosM && Array.isArray(cursosM) && cursosM.length > 0 && !cursosM.includes(proposta.curso)) {
      return res.status(403).json({ sucesso: false, mensagem: `Não tens permissão para aprovar propostas do curso "${proposta.curso}".` });
    }

    await AprovacaoCCA.findOneAndUpdate(
      { propostaId: proposta._id, membroId: req.utilizador._id },
      { decisao: 'aprovado', decididoEm: new Date() },
      { upsert: true, new: true }
    );

    // Verificar se TODOS os membros com acesso a este curso aprovaram
    const membros   = await _membrosComAcesso(proposta.curso);
    const aprovados = await AprovacaoCCA.countDocuments({ propostaId: proposta._id, decisao: 'aprovado' });

    if (aprovados >= membros.length) {
      proposta.estado = 'aprovada';
      await proposta.save();
      await Notificacao.create({
        destinatarioId: proposta.proponenteId,
        tipo: 'proposta_aprovada',
        mensagem: `A sua proposta "${proposta.titulo}" foi aprovada pela Comissão de Curso.`,
        referenciaId: proposta._id
      });
    }

    const votos = await AprovacaoCCA.find({ propostaId: proposta._id }).populate('membroId', 'nome email cursosCCA');
    res.json({ sucesso: true, proposta, totalAprovados: aprovados, totalMembros: membros.length, aprovacoes: votos });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// POST /api/cca/propostas/:id/rejeitar
exports.rejeitar = async (req, res) => {
  try {
    const { feedback } = req.body;
    if (!feedback?.trim()) return res.status(400).json({ sucesso: false, mensagem: 'O feedback é obrigatório.' });

    const proposta = await Proposta.findById(req.params.id);
    if (!proposta) return res.status(404).json({ sucesso: false, mensagem: 'Proposta não encontrada.' });

    const cursosM = req.utilizador.cursosCCA;
    if (cursosM && Array.isArray(cursosM) && cursosM.length > 0 && !cursosM.includes(proposta.curso)) {
      return res.status(403).json({ sucesso: false, mensagem: `Não tens permissão para rejeitar propostas do curso "${proposta.curso}".` });
    }

    proposta.estado    = 'rejeitada';
    proposta.feedbackCCA = feedback.trim();
    await proposta.save();

    await AprovacaoCCA.findOneAndUpdate(
      { propostaId: proposta._id, membroId: req.utilizador._id },
      { decisao: 'rejeitado', feedback: feedback.trim(), decididoEm: new Date() },
      { upsert: true }
    );

    await Notificacao.create({
      destinatarioId: proposta.proponenteId,
      tipo: 'proposta_rejeitada',
      mensagem: `A sua proposta "${proposta.titulo}" foi rejeitada. Motivo: ${feedback.trim()}`,
      referenciaId: proposta._id
    });

    res.json({ sucesso: true, proposta });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// GET /api/cca/propostas/:id/aprovacoes
exports.aprovacoes = async (req, res) => {
  try {
    const proposta = await Proposta.findById(req.params.id);
    if (!proposta) return res.status(404).json({ sucesso: false, mensagem: 'Proposta não encontrada.' });

    const membros = await _membrosComAcesso(proposta.curso);
    const votos   = await AprovacaoCCA.find({ propostaId: req.params.id }).populate('membroId', 'nome email cursosCCA');

    const resultado = membros.map(m => {
      const voto = votos.find(v => v.membroId?._id?.toString() === m._id.toString());
      return {
        membroId:   m._id,
        nome:       m.nome,
        email:      m.email,
        cursosCCA:  m.cursosCCA || [],
        decisao:    voto?.decisao || 'pendente',
        decididoEm: voto?.decididoEm || null
      };
    });

    res.json({
      sucesso: true,
      proposta,
      total: membros.length,
      aprovados: resultado.filter(r => r.decisao === 'aprovado').length,
      membros: resultado
    });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// PUT /api/cca/propostas/:id/orientador
exports.atribuirOrientador = async (req, res) => {
  try {
    const { orientadorId } = req.body;
    if (!orientadorId) return res.status(400).json({ sucesso: false, mensagem: 'orientadorId é obrigatório.' });
    const proposta = await Proposta.findByIdAndUpdate(
      req.params.id, { orientadorId, estado: 'atribuida' }, { new: true }
    ).populate('orientadorId', 'nome email');
    await Notificacao.create({
      destinatarioId: orientadorId,
      tipo: 'orientador_atribuido',
      mensagem: `Foi designado orientador da proposta "${proposta.titulo}".`,
      referenciaId: proposta._id
    });
    res.json({ sucesso: true, proposta });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// GET /api/cca/docentes — para dropdown de atribuir orientador
exports.listarDocentes = async (req, res) => {
  try {
    const docentes = await Utilizador.find({ perfil: 'docente', ativo: true }, 'nome email');
    res.json({ sucesso: true, docentes });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// GET /api/cca/docentes-disponiveis — docentes com conta que ainda não são CCA
exports.docentesDisponiveis = async (req, res) => {
  try {
    const docentes = await Utilizador.find({ perfil: 'docente', ativo: true }, 'nome email');
    res.json({ sucesso: true, docentes });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// GET /api/cca/membros
exports.listarMembros = async (req, res) => {
  try {
    const membros = await Utilizador.find({ perfil: 'comissao', ativo: true }, 'nome email cursosCCA criadoEm');
    res.json({ sucesso: true, membros });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// POST /api/cca/membros — adicionar por email (legacy)
exports.adicionarMembro = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ sucesso: false, mensagem: 'Email obrigatório.' });
    const u = await Utilizador.findOne({ email: email.toLowerCase() });
    if (!u) return res.status(404).json({ sucesso: false, mensagem: 'Utilizador não encontrado.' });
    if (u.perfil === 'comissao') return res.status(400).json({ sucesso: false, mensagem: 'Já é membro da CCA.' });
    u.perfil = 'comissao';
    await u.save();
    res.json({ sucesso: true, mensagem: `${u.nome} foi adicionado à CCA.`, utilizador: u });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// DELETE /api/cca/membros/:id — remover membro
exports.removerMembro = async (req, res) => {
  try {
    if (req.params.id === req.utilizador._id.toString()) {
      return res.status(400).json({ sucesso: false, mensagem: 'Não podes remover-te a ti próprio.' });
    }
    const u = await Utilizador.findByIdAndUpdate(
      req.params.id, { perfil: 'docente', cursosCCA: [] }, { new: true }
    );
    if (!u) return res.status(404).json({ sucesso: false, mensagem: 'Membro não encontrado.' });
    res.json({ sucesso: true, mensagem: `${u.nome} foi removido da CCA.` });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// POST /api/cca/membros/adicionar — adicionar por ID com cursos (ROTA NOVA — evita conflito com /:id)
exports.adicionarMembroPorId = async (req, res) => {
  try {
    const { docenteId, cursosCCA } = req.body;
    if (!docenteId) return res.status(400).json({ sucesso: false, mensagem: 'docenteId é obrigatório.' });
    if (!cursosCCA || cursosCCA.length === 0) return res.status(400).json({ sucesso: false, mensagem: 'Selecciona pelo menos um curso.' });

    const u = await Utilizador.findById(docenteId);
    if (!u) return res.status(404).json({ sucesso: false, mensagem: 'Docente não encontrado.' });
    if (u.perfil === 'comissao') return res.status(400).json({ sucesso: false, mensagem: 'Já é membro da CCA.' });

    u.perfil    = 'comissao';
    u.cursosCCA = cursosCCA;
    await u.save();

    res.json({ sucesso: true, mensagem: `${u.nome} foi adicionado à CCA.`, utilizador: u });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// PUT /api/cca/membros/:id/cursos — actualizar cursos de membro existente
exports.actualizarCursosMembro = async (req, res) => {
  try {
    const { cursosCCA } = req.body;
    if (!cursosCCA || cursosCCA.length === 0) return res.status(400).json({ sucesso: false, mensagem: 'Selecciona pelo menos um curso.' });
    const u = await Utilizador.findByIdAndUpdate(
      req.params.id, { cursosCCA }, { new: true }
    );
    if (!u) return res.status(404).json({ sucesso: false, mensagem: 'Membro não encontrado.' });
    res.json({ sucesso: true, utilizador: u });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

// POST /api/cca/convite — convidar por email
exports.enviarConvite = async (req, res) => {
  try {
    const { email, cursosCCA } = req.body;
    if (!email) return res.status(400).json({ sucesso: false, mensagem: 'Email obrigatório.' });
    if (!cursosCCA || cursosCCA.length === 0) return res.status(400).json({ sucesso: false, mensagem: 'Selecciona pelo menos um curso.' });

    // Se já tem conta, promover directamente
    const existe = await Utilizador.findOne({ email: email.toLowerCase() });
    if (existe) {
      if (existe.perfil === 'comissao') return res.status(400).json({ sucesso: false, mensagem: 'Já é membro da CCA.' });
      existe.perfil    = 'comissao';
      existe.cursosCCA = cursosCCA;
      await existe.save();
      return res.json({ sucesso: true, mensagem: `${existe.nome} já tinha conta e foi adicionado à CCA.`, utilizador: existe });
    }

    // Sem conta — simular envio de email (integrar Nodemailer quando configurado)
    console.log(`[CONVITE CCA] Para: ${email} | Cursos: ${cursosCCA.join(', ')}`);
    res.json({ sucesso: true, mensagem: `Convite enviado para ${email}. O docente receberá um email com instruções para criar conta.` });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};