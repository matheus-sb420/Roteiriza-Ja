const { verificarToken } = require('../servicos/autenticacao');
const { chaveFontes } = require('../config/env');
const { ErroNegocio } = require('../erros');

// Lê "Authorization: Bearer <token>" e confere o tipo de usuário.
function exigirLogin(tipo) {
  return (req, res, next) => {
    const [esquema, token] = (req.headers.authorization || '').split(' ');
    if (esquema !== 'Bearer' || !token) return next(new ErroNegocio(401, 'Faça login'));
    try {
      const dados = verificarToken(token);
      if (dados.tipo !== tipo) return next(new ErroNegocio(403, 'Acesso não permitido'));
      req.usuario = dados;
      return next();
    } catch {
      return next(new ErroNegocio(401, 'Sessão expirada, faça login de novo'));
    }
  };
}

// Fontes de pedidos se identificam pela chave no cabeçalho "x-chave-fonte".
function exigirChaveFonte(req, res, next) {
  if (req.headers['x-chave-fonte'] !== chaveFontes) {
    return next(new ErroNegocio(401, 'Chave da fonte inválida'));
  }
  return next();
}

// Converte qualquer erro numa resposta JSON. Erros inesperados viram 500
// sem expor detalhes internos.
// eslint-disable-next-line no-unused-vars
function tratarErros(erro, req, res, next) {
  if (erro instanceof ErroNegocio) {
    return res.status(erro.status).json({ erro: erro.message, detalhes: erro.detalhes });
  }
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido' });
  }
  console.error(erro);
  return res.status(500).json({ erro: 'Erro interno' });
}

module.exports = {
  exigirAdmin: exigirLogin('admin'),
  exigirEntregador: exigirLogin('entregador'),
  exigirChaveFonte,
  tratarErros,
};
