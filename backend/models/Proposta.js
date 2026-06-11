const mongoose = require('mongoose');

const propostaSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: true,
    maxlength: 50,
    trim: true
  },
  tipo: {
    type: String,
    enum: ['estagio', 'projecto'],
    default: 'estagio'
  },
  curso: {
    type: String,
    enum: ['TeSP DTAM', 'Lic. TSI Web'],
    default: 'TeSP DTAM'
  },
  areas:    { type: [String], default: [] },
  plugIN:   { type: Boolean, default: false },

  // Conteúdo
  descricao:            { type: String, default: '' },
  objetivos:            { type: String, default: '' },
  resultadosEsperados:  { type: String, default: '' },
  planoTrabalho:        { type: String, default: '' },
  perfilCandidato:      { type: String, default: '' },

  // Entidade
  nomeEntidade:        { type: String, default: '' },
  emailContacto:       { type: String, default: '' },
  moradaEntidade:      { type: String, default: '' },
  moradaLocalEstagio:  { type: String, default: '' },

  // Tutor
  tutorNome:  { type: String, default: '' },
  tutorEmail: { type: String, default: '' },
  tutorCargo: { type: String, default: '' },

  // Estado e fluxo
  estado: {
    type: String,
    enum: ['pendente', 'aprovada', 'rejeitada', 'atribuida'],
    default: 'pendente'
  },

  // Feedback da CCA quando rejeitada
  feedbackCCA: { type: String, default: null },

  // Sugestão de melhoria da CCA quando aprovada
  sugestaoCCA: { type: String, default: null },

  // Snapshot dos campos antes da última edição (para mostrar o que mudou à CCA)
  versaoAnterior: { type: mongoose.Schema.Types.Mixed, default: null },

  // Quem submeteu a proposta
  proponenteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilizador',
    required: true
  },

  // Orientador atribuído pela CCA
  orientadorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilizador',
    default: null
  }
}, {
  timestamps: { createdAt: 'criadaEm', updatedAt: 'atualizadaEm' }
});

module.exports = mongoose.model('Proposta', propostaSchema);