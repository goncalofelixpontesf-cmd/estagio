const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const utilizadorSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'O nome e obrigatorio'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'O email e obrigatorio'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email invalido']
  },
  password: {
    type: String,
    required: [true, 'A password e obrigatoria'],
    minlength: [6, 'Minimo 6 caracteres'],
    select: false
  },
  perfil: {
    type: String,
    enum: ['estudante', 'docente', 'entidade', 'comissao', 'admin'],
    required: [true, 'O perfil e obrigatorio']
  },
  // Só relevante quando perfil === 'comissao'
  // Array vazio ou ausente = acesso a todos os cursos
  // ['TeSP DTAM'] = só CTeSP
  // ['Lic. TSI Web'] = só Licenciatura
  // ['TeSP DTAM', 'Lic. TSI Web'] = ambos os cursos
  cursosCCA: {
    type: [String],
    enum: ['TeSP DTAM', 'Lic. TSI Web'],
    default: []
  },
  ativo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' }
});

// Hash password antes de guardar
utilizadorSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Comparar passwords
utilizadorSchema.methods.compararPassword = async function (pass) {
  return await bcrypt.compare(pass, this.password);
};

// Verificar se o membro CCA tem acesso a um curso
// Array vazio = acesso a todos os cursos (ex: presidente da CCA)
utilizadorSchema.methods.temAcessoCurso = function (curso) {
  if (this.perfil !== 'comissao') return false;
  if (!this.cursosCCA || this.cursosCCA.length === 0) return true;
  return this.cursosCCA.includes(curso);
};

module.exports = mongoose.model('Utilizador', utilizadorSchema);