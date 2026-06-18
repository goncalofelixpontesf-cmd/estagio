const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const ctrl    = require('../controllers/utilizadoresController');
const { proteger } = require('../middleware/auth');

// Configuração do multer para CV — guarda na pasta dedicada /CV
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'CV')),
  filename:    (req, file, cb) => {
    // Usar o nome original do ficheiro, mas sanitizado para remover caracteres
    // problemáticos e garantir que não há conflitos entre utilizadores diferentes.
    const nomeOriginal = path.basename(file.originalname, path.extname(file.originalname))
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remover acentos
      .replace(/[^a-zA-Z0-9\s-_]/g, '')                // só letras, números, espaços, - e _
      .trim().replace(/\s+/g, '_')                       // espaços → underscores
      .substring(0, 60);                                 // máx. 60 caracteres
    cb(null, `${nomeOriginal}.pdf`);
  }
});
const uploadCV = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Apenas ficheiros PDF são aceites.'));
  }
});

router.use(proteger);

router.get('/perfil',       ctrl.obterPerfil);
router.put('/perfil',       ctrl.editarPerfil);
router.post('/cv', uploadCV.single('cv'), ctrl.uploadCV);
router.delete('/cv', ctrl.removerCV);

// Extração de notas via IA (PDF DOMUS)
router.post('/extrair-notas', ctrl.extrairNotasDomus);

// Tutorias do docente atribuído
router.get('/tutorias', ctrl.minhasTutorias);

module.exports = router;