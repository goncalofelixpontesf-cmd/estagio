const express   = require('express');
const cors      = require('cors');
const dotenv    = require('dotenv');
const path      = require('path');
const fs        = require('fs');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

// Garantir que a pasta uploads existe
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// Garantir que a pasta CV existe (guarda os CVs dos estudantes)
const cvDir = path.join(__dirname, 'CV');
if (!fs.existsSync(cvDir)) fs.mkdirSync(cvDir);

const app = express();

app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:5500', 'http://127.0.0.1:5500',
    'http://192.168.1.66:5500'
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir ficheiros estáticos — CVs e outros uploads
app.use('/uploads', express.static(uploadsDir));
app.use('/cv',      express.static(cvDir));

// Rotas
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/propostas',     require('./routes/propostas'));
app.use('/api/utilizadores',  require('./routes/utilizadores-routes'));
app.use('/api/cca',           require('./routes/cca'));
app.use('/api/candidaturas',  require('./routes/candidaturas-routes'));
app.use('/api/notificacoes',  require('./routes/notificacoes-routes'));

app.get('/', (req, res) => res.json({ mensagem: 'API ESMAD a funcionar!' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor na porta ${PORT}`));