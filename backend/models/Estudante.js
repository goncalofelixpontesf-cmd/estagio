const mongoose = require('mongoose');

const estudanteSchema = new mongoose.Schema({
  utilizadorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilizador',
    required: true,
    unique: true
  },
  curso: {
    type: String,
    enum: ['TeSP DTAM', 'Lic. TSI Web'],
    default: 'TeSP DTAM'
  },
  ano: {
    type: Number,
    min: 2,
    max: 3,
    default: 2   // mínimo é sempre 2 — nenhum estudante entra no 1º ano
  },
  // Guarda a data em que o estudante de Licenciatura criou conta.
  // Ao fim de 6 meses, o ano é automaticamente atualizado de 2 para 3
  // quando o perfil é carregado (ver utilizadoresController.js → perfil).
  dataInicioLicenciatura: { type: Date, default: null },
  mediaFinal: {
    type: Number,
    min: 0,
    max: 20
  },
  telefone:  { type: String, default: '' },
  portfolio: { type: String, default: '' },
  linkedin:  { type: String, default: '' },

  // Percurso académico — disciplinas extraídas do DOMUS ou inseridas manualmente.
  // A mediaFinal acima é recalculada a partir destas sempre que são actualizadas.
  disciplinas: [{
    nome:   { type: String, required: true },
    nota:   { type: Number, default: null },
    estado: { type: String, enum: ['concluida', 'em_curso', 'reprovada', 'pendente'], default: 'pendente' },
    ano:    { type: Number, default: 1 }
  }],

  // Ficheiro PDF do CV — guarda apenas o nome do ficheiro (ex: cv-<id>-<timestamp>.pdf)
  // O ficheiro fica em /CV no servidor (pasta dedicada, servida em /cv/<ficheiro>)
  cv: { type: String, default: null },

  // Cópia de segurança do CV no Cloudinary (URL completo) — só preenchido se o
  // backup tiver sucesso; serve como redundância caso o disco do servidor falhe
  cvCloudinaryUrl: { type: String, default: null },

  propostaEscolhidaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proposta',
    default: null
  }
}, {
  timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' }
});

module.exports = mongoose.model('Estudante', estudanteSchema);