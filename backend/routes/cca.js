const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/ccaController');
const { proteger, restringir } = require('../middleware/auth');

router.use(proteger);

// Leitura dos prazos — acessível a todos os utilizadores autenticados
router.get('/datas', ctrl.obterDatas);

// Todas as rotas abaixo exigem perfil comissao ou admin
router.use(restringir('comissao', 'admin'));

// Propostas
router.get('/stats',                       ctrl.stats);
router.get('/propostas/pendentes',         ctrl.listarPendentes);
router.get('/propostas',                   ctrl.listarTodas);
router.post('/propostas/:id/aprovar',      ctrl.aprovar);
router.post('/propostas/:id/rejeitar',     ctrl.rejeitar);
router.get('/propostas/:id/aprovacoes',    ctrl.aprovacoes);
router.put('/propostas/:id/orientador',    ctrl.atribuirOrientador);

// Docentes e membros
router.get('/docentes',                    ctrl.listarDocentes);
router.get('/docentes-disponiveis',        ctrl.docentesDisponiveis);
router.get('/membros',                     ctrl.listarMembros);
router.post('/membros',                    ctrl.adicionarMembro);

// IMPORTANTE: /membros/adicionar tem de vir ANTES de /membros/:id
// caso contrário o Express interpreta "adicionar" como o parâmetro :id
router.post('/membros/adicionar',          ctrl.adicionarMembroPorId);
router.put('/membros/:id/cursos',          ctrl.actualizarCursosMembro);
router.delete('/membros/:id',              ctrl.removerMembro);

// Convite por email
router.post('/convite', ctrl.enviarConvite);

// Datas do processo
router.get('/datas',  ctrl.obterDatas);
router.put('/datas',  ctrl.guardarDatas);

module.exports = router;