const mongoose = require('mongoose');

// Convites pendentes para docentes que ainda não têm conta na app.
// Quando o docente se regista com este email, é promovido automaticamente a 'comissao'.
const conviteSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    unique: true
  },
  cursosCCA: {
    type: [String],
    enum: ['TeSP DTAM', 'Lic. TSI Web'],
    default: []
  },
  convidadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilizador'
  }
}, {
  timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' }
});

module.exports = mongoose.model('Convite', conviteSchema);