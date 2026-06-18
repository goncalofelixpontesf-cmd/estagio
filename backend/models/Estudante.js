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
    min: 1,
    max: 3,
    default: 1
  },
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
    estado: { type: String, enum: ['concluida', 'em_curso', 'reprovada', 'pendente'], default: 'pendente' }
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