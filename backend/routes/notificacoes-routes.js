const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/notificacoesController');
const { proteger } = require('../middleware/auth');

router.use(proteger);

router.get('/',          ctrl.listar);
router.put('/lidas',     ctrl.marcarTodasLidas);
router.put('/:id/lida',  ctrl.marcarLida);

module.exports = router;