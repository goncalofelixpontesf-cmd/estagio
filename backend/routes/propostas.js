const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/propostasController');
const { proteger, restringir } = require('../middleware/auth');

router.use(proteger);

// Listar propostas (todos os perfis autenticados)
router.get('/', ctrl.listar);

// Criar proposta (estudante ou entidade/docente)
router.post('/', ctrl.criar);

// Tutorias do docente autenticado
router.get('/minhas-tutorias', restringir('docente'), ctrl.minhasTutorias);

// Obter proposta individual
router.get('/:id', ctrl.obterProposta);

// Proponente edita proposta rejeitada (estudante, docente ou entidade)
router.put('/:id', restringir('estudante', 'docente', 'entidade'), ctrl.editarProposta);

module.exports = router;