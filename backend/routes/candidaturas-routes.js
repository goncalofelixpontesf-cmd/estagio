const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/candidaturasController');
const { proteger, restringir } = require('../middleware/auth');

router.use(proteger);

// Estudante — ver as suas candidaturas
router.get('/minhas', restringir('estudante'), ctrl.minhas);

// Estudante — manifestar interesse numa proposta
router.post('/:propostaId', restringir('estudante'), ctrl.manifestarInteresse);

// Estudante — tomar conhecimento da entrevista
router.put('/:id/conhecimento', restringir('estudante'), ctrl.tomarConhecimento);

// Entidade / Docente — ver candidatos de uma proposta
router.get('/proposta/:propostaId', restringir('docente', 'entidade', 'comissao', 'admin'), ctrl.candidatosDeProposta);

// Entidade / Docente — agendar entrevista
router.put('/:id/entrevista', restringir('docente', 'entidade'), ctrl.agendarEntrevista);

// Entidade / Docente — aceitar ou rejeitar candidato
router.put('/:id/aceitar',  restringir('docente', 'entidade'), ctrl.aceitar);
router.put('/:id/rejeitar', restringir('docente', 'entidade'), ctrl.rejeitar);

module.exports = router;