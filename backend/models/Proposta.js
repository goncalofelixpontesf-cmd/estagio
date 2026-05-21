const mongoose = require('mongoose');

const propostaSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: [true, 'O titulo e obrigatorio'],
    maxlength: [50, 'Max. 50 caracteres'],
    trim: true
  },
  tipo: {
    type: String,
    enum: ['estagio', 'projecto'],
    required: true
  },
  descricao:           { type: String, required: true },
  objetivos:           { type: String, required: true },
  resultadosEsperados: { type: String, required: true },
  perfilCandidato:     { type: String },
  planoTrabalho:       { type: String },
  areas: [{
    type: String,
    enum: ['UI/UX','Front-end','Back-end','Full-stack','Mobile','Games/Graphics','Marketing Digital','Outro']
  }],
  plugIN: { type: Boolean, default: false },

  // Dados da entidade (quando submetido por entidade externa)
  nomeEntidade:      { type: String },
  moradaEntidade:    { type: String },
  emailContacto:     { type: String },
  moradaLocalEstagio:{ type: String },
  tutorNome:         { type: String },
  tutorCargo:        { type: String },
  tutorEmail:        { type: String },

  estado: {
    type: String,
    enum: ['pendente', 'aprovada', 'rejeitada', 'atribuida'],
    default: 'pendente'
  },
  proponenteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilizador',
    required: true
  },
  tipoProponente: {
    type: String,
    enum: ['entidade', 'docente', 'estudante'],
    required: true
  },
  curso: {
    type: String,
    required: true,
    default: 'TeSP DTAM'
  },
  feedbackCCA:  { type: String },
  orientadorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilizador', default: null },
  estudanteId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Estudante',  default: null }
}, {
  timestamps: { createdAt: 'criadaEm', updatedAt: 'atualizadaEm' }
});

propostaSchema.index({ titulo: 'text', descricao: 'text' });

module.exports = mongoose.model('Proposta', propostaSchema);
