const Utilizador = require('../models/Utilizador');
const Estudante  = require('../models/Estudante');
const Entidade   = require('../models/Entidade');
const path       = require('path');
const fs         = require('fs');
const { enviarBackupCV } = require('../utils/cloudinary');

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
      const updateEstudante = {};
      if (telefone  !== undefined) updateEstudante.telefone  = telefone;
      if (linkedin  !== undefined) updateEstudante.linkedin  = linkedin;
      if (portfolio !== undefined) updateEstudante.portfolio = portfolio;
      // Disciplinas extraídas do DOMUS ou inseridas manualmente
      if (req.body.disciplinas !== undefined) {
        updateEstudante.disciplinas = req.body.disciplinas;
        // Recalcular a média a partir das disciplinas com nota atribuída
        const comNota = req.body.disciplinas.filter(d => d.nota !== null && d.nota !== undefined && d.nota !== '');
        updateEstudante.mediaFinal = comNota.length
          ? comNota.reduce((soma, d) => soma + Number(d.nota), 0) / comNota.length
          : null;
      }

      if (Object.keys(updateEstudante).length) {
        await Estudante.findOneAndUpdate(
          { utilizadorId: req.utilizador._id },
          updateEstudante,
          { new: true }
        );
      }
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
      const caminhoAntigo = path.join(__dirname, '..', 'CV', estudante.cv);
      if (fs.existsSync(caminhoAntigo)) fs.unlinkSync(caminhoAntigo);
    }

    estudante.cv = req.file.filename;

    // Backup no Cloudinary (não bloqueia o resto se falhar — é só redundância)
    const publicId = path.parse(req.file.filename).name;
    estudante.cvCloudinaryUrl = await enviarBackupCV(req.file.path, publicId);

    await estudante.save();

    res.json({
      sucesso: true,
      cv: req.file.filename,
      cvUrl: `/cv/${req.file.filename}`,
      cvBackup: estudante.cvCloudinaryUrl,
      mensagem: estudante.cvCloudinaryUrl
        ? 'CV guardado com sucesso (com backup no Cloudinary).'
        : 'CV guardado com sucesso no servidor (o backup no Cloudinary não foi possível).'
    });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};  

// POST /api/utilizadores/extrair-notas
// Recebe um PDF em base64, chama a API Anthropic e devolve as disciplinas extraídas
exports.extrairNotasDomus = async (req, res) => {
  try {
    const { pdfBase64 } = req.body;
    if (!pdfBase64) return res.status(400).json({ sucesso: false, mensagem: 'PDF não fornecido.' });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(503).json({ sucesso: false, mensagem: 'A extração automática não está disponível (API key não configurada). Usa o Editar Perfil para introduzir as notas manualmente.' });

    const resposta = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 }
            },
            {
              type: 'text',
              text: 'Extrai todas as disciplinas/unidades curriculares e respetivas notas deste documento academico. Responde APENAS com um array JSON puro, sem markdown nem texto adicional, no formato: [{"nome":"Nome da Disciplina","nota":15,"estado":"concluida"}]. Regras de estado: "concluida" se nota >= 10, "reprovada" se nota < 10, "em_curso" se sem nota final. Usa null para nota ausente.'
            }
          ]
        }]
      })
    });

    const dados = await resposta.json();
    if (!resposta.ok) {
      return res.status(500).json({ sucesso: false, mensagem: dados.error?.message || 'Erro na API Anthropic.' });
    }

    const texto = dados.content?.[0]?.text || '';
    const limpo = texto.replace(/```json|```/g, '').trim();
    const disciplinas = JSON.parse(limpo);

    res.json({ sucesso: true, disciplinas });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: 'Nao foi possivel extrair as notas: ' + err.message });
  }
};


// GET /api/utilizadores/tutorias
// Propostas onde o docente autenticado é o orientador atribuído
exports.minhasTutorias = async (req, res) => {
  try {
    const Proposta    = require('../models/Proposta');
    const Candidatura = require('../models/Candidatura');
    const Estudante   = require('../models/Estudante');

    const propostas = await Proposta.find({ orientadorId: req.utilizador._id })
      .populate('proponenteId', 'nome email')
      .sort({ atualizadaEm: -1 });

    const resultado = await Promise.all(propostas.map(async p => {
      const cands = await Candidatura.find({ propostaId: p._id });
      const candAceite = cands.find(function(cd) { return cd.estado === 'aceite'; });

      let estudanteAceite = null;
      if (candAceite) {
        const est = await Estudante.findById(candAceite.estudanteId)
          .populate('utilizadorId', 'nome email');
        if (est && est.utilizadorId) {
          estudanteAceite = { nome: est.utilizadorId.nome, email: est.utilizadorId.email };
        }
      }

      return { ...p.toObject(), totalCandidatos: cands.length, estudanteAceite };
    }));

    res.json({ sucesso: true, total: resultado.length, propostas: resultado });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};