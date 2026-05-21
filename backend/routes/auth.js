const express = require('express');
const router  = express.Router();
const { registo, login, eu } = require('../controllers/authController');
const { proteger } = require('../middleware/auth');

router.post('/registo', registo);
router.post('/login',   login);
router.get('/eu',       proteger, eu);

module.exports = router;
