const mongoose = require('mongoose');

const aprovacaoCCASchema = new mongoose.Schema({
  propostaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proposta',
    required: true
  },
  membroId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilizador',
    required: true
  },
  decisao: {
    type: String,
    enum: ['pendente', 'aprovado', 'rejeitado'],
    default: 'pendente'
  },
  sugestao:   { type: String, default: null },
  feedback:   { type: String, default: null },
  decididoEm: { type: Date }
}, {
  timestamps: { createdAt: 'criadoEm' }
});

// Um membro só pode ter um voto por proposta
aprovacaoCCASchema.index({ propostaId: 1, membroId: 1 }, { unique: true });

module.exports = mongoose.model('AprovacaoCCA', aprovacaoCCASchema);