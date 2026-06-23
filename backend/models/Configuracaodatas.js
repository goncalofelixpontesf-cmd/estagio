const mongoose = require('mongoose');

// Documento único (singleton) — guarda as datas do processo académico
// configuradas pela CCA. Usa um campo fixo "chave" para garantir
// que só existe sempre um documento deste tipo na base de dados.
const configuracaoDatasSchema = new mongoose.Schema({
  chave: { type: String, default: 'datas_processo', unique: true },

  prop_inicio: { type: Date, default: null },
  prop_fim:    { type: Date, default: null },
  int_inicio:  { type: Date, default: null },
  int_fim:     { type: Date, default: null },
  tut_inicio:  { type: Date, default: null },
  tut_fim:     { type: Date, default: null },

  atualizadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilizador', default: null },
}, {
  timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' }
});

module.exports = mongoose.model('ConfiguracaoDatas', configuracaoDatasSchema);