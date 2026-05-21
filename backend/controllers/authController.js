const jwt = require('jsonwebtoken');
const Utilizador = require('../models/Utilizador');
const Estudante  = require('../models/Estudante');
const Entidade   = require('../models/Entidade');

const gerarToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

// Validações de email por perfil
function validarEmail(email, perfil) {
  const emailLower = email.toLowerCase();

  if (perfil === 'estudante') {
    // Número de estudante (só dígitos) + @esmad.ipp.pt
    // Ex: 40240310@esmad.ipp.pt
    const regex = /^\d+@esmad\.ipp\.pt$/;
    if (!regex.test(emailLower)) {
      return 'O email de estudante deve ter o formato:(ex: 00000000@esmad.ipp.pt)';
    }
  }

  if (perfil === 'docente') {
    // Nome (começa por letras, pode ter pontos) + @esmad.ipp.pt
    // Ex: linooliveira@esmad.ipp.pt ou lino.oliveira@esmad.ipp.pt
    const regex = /^[a-zA-Z][a-zA-Z0-9.]+@esmad\.ipp\.pt$/;
    if (!regex.test(emailLower)) {
      return 'O email de docente deve ter o formato:(ex: nome@esmad.ipp.pt)';
    }
  }

  // Entidade pode ter qualquer email válido
  return null;
}

// POST /api/auth/registo
exports.registo = async (req, res) => {
  try {
    const { nome, email, password, perfil, curso, nomeEntidade } = req.body;

    if (!nome || !email || !password || !perfil) {
      return res.status(400).json({ sucesso: false, mensagem: 'Preenche todos os campos obrigatórios.' });
    }

    if (!['estudante', 'docente', 'entidade'].includes(perfil)) {
      return res.status(400).json({ sucesso: false, mensagem: 'Perfil inválido.' });
    }

    // Validar formato de email conforme perfil
    const erroEmail = validarEmail(email, perfil);
    if (erroEmail) {
      return res.status(400).json({ sucesso: false, mensagem: erroEmail });
    }

    const existe = await Utilizador.findOne({ email: email.toLowerCase() });
    if (existe) {
      return res.status(400).json({ sucesso: false, mensagem: 'Este email já está registado.' });
    }

    const utilizador = await Utilizador.create({ nome, email, password, perfil });

    if (perfil === 'estudante') {
      await Estudante.create({
        utilizadorId: utilizador._id,
        curso: curso || 'TeSP DTAM',
        ano: 1
      });
    } else if (perfil === 'entidade') {
      await Entidade.create({
        utilizadorId: utilizador._id,
        nomeEntidade: nomeEntidade || nome,
        tutorNome:    nome,
        tutorEmail:   email
      });
    }

    const token = gerarToken(utilizador._id);
    res.status(201).json({
      sucesso: true,
      token,
      utilizador: {
        id:     utilizador._id,
        nome:   utilizador.nome,
        email:  utilizador.email,
        perfil: utilizador.perfil
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ sucesso: false, mensagem: 'Este email já está registado.' });
    }
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno. Tenta novamente.' });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ sucesso: false, mensagem: 'Introduz o email e a password.' });
    }

    const utilizador = await Utilizador.findOne({ email }).select('+password');
    if (!utilizador || !utilizador.ativo) {
      return res.status(401).json({ sucesso: false, mensagem: 'Credenciais inválidas.' });
    }

    const ok = await utilizador.compararPassword(password);
    if (!ok) {
      return res.status(401).json({ sucesso: false, mensagem: 'Credenciais inválidas.' });
    }

    const token = gerarToken(utilizador._id);
    res.json({
      sucesso: true,
      token,
      utilizador: {
        id:     utilizador._id,
        nome:   utilizador.nome,
        email:  utilizador.email,
        perfil: utilizador.perfil
      }
    });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno. Tenta novamente.' });
  }
};

// GET /api/auth/eu
exports.eu = async (req, res) => {
  try {
    const utilizador = await Utilizador.findById(req.utilizador._id);
    res.json({ sucesso: true, utilizador });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
  }
};