const mongoose = require('mongoose');

const notificacaoSchema = new mongoose.Schema({
  destinatarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilizador', required: true },
  tipo: {
    type: String,
    enum: ['nova_proposta','proposta_aprovada','proposta_rejeitada','novo_interesse',
           'entrevista_agendada','candidatura_aceite','candidatura_rejeitada',
           'orientador_atribuido','documento_disponivel'],
    required: true
  },
  mensagem:     { type: String, required: true },
  lida:         { type: Boolean, default: false },
  enviadaEm:    { type: Date, default: Date.now },
  referenciaId: { type: mongoose.Schema.Types.ObjectId, default: null }
});

module.exports = mongoose.model('Notificacao', notificacaoSchema);
