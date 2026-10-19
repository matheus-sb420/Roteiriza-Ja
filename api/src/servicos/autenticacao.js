// Login do administrador (RF01) e emissão de tokens.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Administrador, Entregador } = require('../models');
const { normalizarTelefone } = require('./entregadores');
const { segredoJwt } = require('../config/env');
const { ErroNegocio } = require('../erros');

const DURACAO_TOKEN = '12h'; // uma noite de trabalho

function emitirToken(tipo, id) {
  return jwt.sign({ tipo, id }, segredoJwt, { expiresIn: DURACAO_TOKEN });
}

function verificarToken(token) {
  return jwt.verify(token, segredoJwt);
}

async function loginAdministrador(usuario, senha) {
  const admin = await Administrador.scope('comSenha').findOne({ where: { usuario: usuario || '' } });
  // Mesma mensagem para usuário e senha errados, para não revelar quais usuários existem.
  if (!admin || !(await bcrypt.compare(String(senha || ''), admin.senhaHash))) {
    throw new ErroNegocio(401, 'Usuário ou senha inválidos');
  }
  return { token: emitirToken('admin', admin.id), usuario: admin.usuario };
}

// RF22 / RN21: login do entregador com telefone e PIN.
async function loginEntregador(telefone, pin) {
  const entregador = await Entregador.scope('comPin').findOne({
    where: { telefone: normalizarTelefone(telefone) },
  });
  if (!entregador || !(await bcrypt.compare(String(pin || ''), entregador.pinHash))) {
    throw new ErroNegocio(401, 'Telefone ou PIN inválidos');
  }
  return { token: emitirToken('entregador', entregador.id), nome: entregador.nome };
}

module.exports = { emitirToken, verificarToken, loginAdministrador, loginEntregador };
