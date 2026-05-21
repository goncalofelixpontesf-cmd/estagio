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
    enum: ['pendente', 'entrevista_agendada', 'aceite', 'rejeitada'],
    default: 'pendente'
  },
  dataEntrevista:    { type: Date },
  localEntrevista:   { type: String },
  notaEntidade:      { type: String }
}, {
  timestamps: { createdAt: 'criadaEm', updatedAt: 'atualizadaEm' }
});

candidaturaSchema.index({ propostaId: 1, estudanteId: 1 }, { unique: true });

module.exports = mongoose.model('Candidatura', candidaturaSchema);
