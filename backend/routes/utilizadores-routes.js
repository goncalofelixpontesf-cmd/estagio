const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const ctrl    = require('../controllers/utilizadoresController');
const { proteger } = require('../middleware/auth');

// Configuração do multer para CV
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `cv-${req.utilizador._id}-${Date.now()}${ext}`);
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

// Extração de notas via IA (PDF DOMUS)
router.post('/extrair-notas', ctrl.extrairNotasDomus);

// Tutorias do docente atribuído
router.get('/tutorias', ctrl.minhasTutorias);

module.exports = router;