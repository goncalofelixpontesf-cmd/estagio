const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/candidaturasController');
const { proteger, restringir } = require('../middleware/auth');

router.use(proteger);

router.get('/proposta/:propostaId', restringir('entidade','docente','comissao','admin'), ctrl.candidatosDeProposta);
router.put('/:id/entrevista',       restringir('entidade','docente'), ctrl.agendarEntrevista);
router.put('/:id/aceitar',          restringir('entidade','docente'), ctrl.aceitar);
router.put('/:id/rejeitar',         restringir('entidade','docente'), ctrl.rejeitar);

module.exports = router;
