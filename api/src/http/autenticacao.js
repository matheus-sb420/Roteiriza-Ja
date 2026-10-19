const { Router } = require('express');
const { loginAdministrador } = require('../servicos/autenticacao');

const router = Router();

router.post('/login', async (req, res) => {
  res.json(await loginAdministrador(req.body.usuario, req.body.senha));
});

module.exports = router;
