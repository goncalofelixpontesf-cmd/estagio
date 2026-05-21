const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/propostasController');
const { proteger, restringir } = require('../middleware/auth');

router.use(proteger);

router.get('/',              ctrl.listar);
router.get('/stats/estudante', restringir('estudante'), ctrl.statsEstudante);
router.get('/:id',           ctrl.obter);
router.post('/',             restringir('entidade','docente','estudante','admin'), ctrl.criar);
router.post('/:id/interesse',restringir('estudante'), ctrl.manifestarInteresse);

module.exports = router;
