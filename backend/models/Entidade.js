const mongoose = require('mongoose');

const entidadeSchema = new mongoose.Schema({
  utilizadorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilizador',
    required: true,
    unique: true
  },
  nomeEntidade: { type: String, required: true, trim: true },
  nif:          { type: String, trim: true },
  morada:       { type: String, trim: true },
  website:      { type: String, trim: true },
  contacto:     { type: String, trim: true },
  tutorNome:    { type: String, trim: true },
  tutorEmail:   { type: String, trim: true, lowercase: true }
}, {
  timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' }
});

module.exports = mongoose.model('Entidade', entidadeSchema);
