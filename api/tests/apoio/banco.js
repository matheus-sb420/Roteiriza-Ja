// Funções de apoio para os testes que usam o banco de teste.
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { sequelize, Administrador, Configuracao } = require('../../src/models');
const { criarApp } = require('../../src/app');
const { pontoADistancia } = require('../../src/nucleo/geo');
const { chaveFontes } = require('../../src/config/env');

const CONFIG_PADRAO = {
  enderecoPizzaria: 'Pizzaria de teste',
  latitudePizzaria: -22.9099,
  longitudePizzaria: -47.0526,
  raioMaximoKm: 8,
  temposPorAnelMin: [10, 15, 20, 25, 30, 35],
  limiteCriticoMin: 10,
  prazoRetencaoDias: 30,
  modoDemonstracao: true,
};
const CENTRO = { latitude: CONFIG_PADRAO.latitudePizzaria, longitude: CONFIG_PADRAO.longitudePizzaria };

async function limparBanco() {
  await sequelize.query(
    'TRUNCATE paradas, rotas, pedidos, entregadores, administradores, configuracoes RESTART IDENTITY CASCADE',
  );
  await Configuracao.create(CONFIG_PADRAO);
}

const app = criarApp();

async function tokenAdmin() {
  await Administrador.create({ usuario: 'admin', senhaHash: await bcrypt.hash('senha', 4) });
  const resposta = await request(app).post('/auth/login').send({ usuario: 'admin', senha: 'senha' });
  return resposta.body.token;
}

// Monta um pedido no formato do contrato, a "km" da pizzaria no "rumo" dado,
// com o horário prometido daqui a "minutos".
function pedidoContrato({ km = 3, rumo = 45, minutos = 45, ...extra } = {}) {
  const agora = Date.now();
  return {
    plataforma: 'iFood',
    codigoExibicao: '4821',
    origem: 'SIMULADOR',
    endereco: 'Rua X, 100',
    clienteNome: 'Maria',
    clienteTelefone: '19999990000',
    ...pontoADistancia(CENTRO, km, rumo),
    horarioPedido: new Date(agora - 5 * 60000).toISOString(),
    horarioPrometido: new Date(agora + minutos * 60000).toISOString(),
    tipoEntrega: 'propria',
    exigeCodigo: true,
    localizador: 'LOC-1',
    ...extra,
  };
}

const comChave = (req) => req.set('x-chave-fonte', chaveFontes);

module.exports = { app, request, limparBanco, tokenAdmin, pedidoContrato, comChave, CENTRO, CONFIG_PADRAO };
