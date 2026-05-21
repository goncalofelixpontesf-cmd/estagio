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

  // Ficheiro PDF do CV — guarda apenas o nome do ficheiro (ex: cv-<id>-<timestamp>.pdf)
  // O ficheiro fica em /uploads/ no servidor
  cv: { type: String, default: null },

  propostaEscolhidaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proposta',
    default: null
  }
}, {
  timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' }
});

module.exports = mongoose.model('Estudante', estudanteSchema);