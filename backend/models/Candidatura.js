const mongoose = require('mongoose');

const candidaturaSchema = new mongoose.Schema({
  propostaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proposta',
    required: true
  },
  estudanteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Estudante',
    required: true
  },
  estado: {
    type: String,
    enum: ['pendente', 'entrevista_agendada', 'aceite', 'confirmada', 'recusada', 'rejeitada'],
    default: 'pendente'
  },

  // Entrevista
  dataEntrevista:  { type: Date,   default: null },
  localEntrevista: { type: String, default: null },

  // O estudante confirmou que tomou conhecimento da entrevista
  conhecimentoEntrevista: { type: Boolean, default: false },
  conhecimentoEm:         { type: Date,    default: null },

  // Feedback quando rejeitado
  feedback: { type: String, default: null }
}, {
  timestamps: { createdAt: 'criadaEm', updatedAt: 'atualizadaEm' }
});

module.exports = mongoose.model('Candidatura', candidaturaSchema);