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

      // Atualização automática de ano para estudantes de Licenciatura:
      // DTAM → sempre 2º ano (fixo, nunca muda)
      // Lic. TSI Web → começa no 2º, passa para o 3º ao fim de 6 meses
      if (dadosExtra) {
        let novoAno = dadosExtra.ano;

        if (dadosExtra.curso === 'TeSP DTAM') {
          novoAno = 2; // fixo — DTAM é sempre 2º ano
        } else if (dadosExtra.curso === 'Lic. TSI Web') {
          if (dadosExtra.dataInicioLicenciatura) {
            const mesesDecorridos = (Date.now() - new Date(dadosExtra.dataInicioLicenciatura).getTime())
              / (1000 * 60 * 60 * 24 * 30.44);
            novoAno = mesesDecorridos >= 6 ? 3 : 2;
          } else {
            // Conta criada antes de existir o campo dataInicioLicenciatura —
            // garantir pelo menos o 2º ano e guardar a data de hoje para
            // que a transição para o 3º ano passe a funcionar daqui em diante.
            novoAno = 2;
            await Estudante.findOneAndUpdate(
              { utilizadorId: utilizador._id },
              { dataInicioLicenciatura: new Date() }
            );
          }
        }

        if (novoAno !== dadosExtra.ano) {
          await Estudante.findOneAndUpdate(
            { utilizadorId: utilizador._id },
            { ano: novoAno }
          );
          dadosExtra.ano = novoAno; // actualizar o objecto local para a resposta
        }
      }
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
        // Ignorar linhas em branco (sem nome) que tenham ficado no formulário
        const discsValidas = req.body.disciplinas.filter(d => d.nome && d.nome.trim() !== '');
        updateEstudante.disciplinas = discsValidas;
        // Recalcular a média a partir das disciplinas com nota atribuída
        const comNota = discsValidas.filter(d => d.nota !== null && d.nota !== undefined && d.nota !== '');
        updateEstudante.mediaFinal = comNota.length
          ? comNota.reduce((soma, d) => soma + Number(d.nota), 0) / comNota.length
          : null;
      }

      if (Object.keys(updateEstudante).length) {
        await Estudante.findOneAndUpdate(
          { utilizadorId: req.utilizador._id },
          updateEstudante,
          { new: true, runValidators: true }
        );
      }
    }

    const utilizador = await Utilizador.findById(req.utilizador._id);
    let dadosExtra = await Estudante.findOne({ utilizadorId: utilizador._id })
      .populate('propostaEscolhidaId', 'titulo');

    // Aplicar a mesma lógica de ano correto do GET /perfil
    if (dadosExtra) {
      let novoAno = dadosExtra.ano;
      if (dadosExtra.curso === 'TeSP DTAM') {
        novoAno = 2;
      } else if (dadosExtra.curso === 'Lic. TSI Web') {
        if (dadosExtra.dataInicioLicenciatura) {
          const meses = (Date.now() - new Date(dadosExtra.dataInicioLicenciatura).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
          novoAno = meses >= 6 ? 3 : 2;
        } else {
          novoAno = 2;
          await Estudante.findOneAndUpdate(
            { utilizadorId: utilizador._id },
            { dataInicioLicenciatura: new Date() }
          );
        }
      }
      if (novoAno !== dadosExtra.ano) {
        await Estudante.findOneAndUpdate({ utilizadorId: utilizador._id }, { ano: novoAno });
        dadosExtra.ano = novoAno;
      }
    }

    res.json({ sucesso: true, utilizador, dadosExtra });
  } catch (err) {
    console.error('[editarPerfil] Erro:', err);
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

    // O ficheiro é sempre guardado com o mesmo nome (cv-<id>.pdf), por isso
    // sobrescreve automaticamente o anterior em disco — sem apagar, sem conflitos.
    await Estudante.findOneAndUpdate(
      { utilizadorId: req.utilizador._id },
      { cv: req.file.filename }
    );

    res.json({
      sucesso: true,
      cv: req.file.filename,
      cvUrl: `/cv/${req.file.filename}`,
      mensagem: 'CV guardado com sucesso.'
    });

    // Backup no Cloudinary em segundo plano — não bloqueia a resposta
    const publicId = path.parse(req.file.filename).name;
    enviarBackupCV(req.file.path, publicId)
      .then(cvCloudinaryUrl => {
        if (cvCloudinaryUrl) {
          return Estudante.findOneAndUpdate(
            { utilizadorId: req.utilizador._id },
            { cvCloudinaryUrl }
          );
        }
      })
      .catch(err => console.error('[uploadCV] Backup Cloudinary falhou:', err.message));

  } catch (err) {
    console.error('[uploadCV] Erro:', err);
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};  

// DELETE /api/utilizadores/cv
exports.removerCV = async (req, res) => {
  try {
    const estudante = await Estudante.findOne({ utilizadorId: req.utilizador._id });
    if (!estudante) {
      return res.status(404).json({ sucesso: false, mensagem: 'Perfil de estudante não encontrado.' });
    }
    if (!estudante.cv) {
      return res.status(400).json({ sucesso: false, mensagem: 'Não tens nenhum CV carregado.' });
    }

    // Apagar o ficheiro em disco, se existir — sem deixar bloquear o pedido
    // se o ficheiro estiver temporariamente bloqueado (ex: OneDrive)
    const caminho = path.join(__dirname, '..', 'CV', estudante.cv);
    try {
      if (fs.existsSync(caminho)) fs.unlinkSync(caminho);
    } catch (errApagar) {
      console.warn('[removerCV] Não foi possível apagar o ficheiro (talvez bloqueado):', errApagar.message);
    }

    // Mesma razão que no uploadCV: findOneAndUpdate em vez de .save() do
    // documento inteiro, para não depender da validade de outros campos.
    await Estudante.findOneAndUpdate(
      { utilizadorId: req.utilizador._id },
      { cv: null, cvCloudinaryUrl: null }
    );

    res.json({ sucesso: true, mensagem: 'CV removido com sucesso.' });
  } catch (err) {
    console.error('[removerCV] Erro:', err);
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