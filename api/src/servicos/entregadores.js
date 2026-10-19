// Cadastro de entregadores (RF15, RN21).
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { Entregador, Rota } = require('../models');
const { SITUACAO_ENTREGADOR, STATUS_ROTA } = require('../nucleo/constantes');
const { ErroNegocio, naoEncontrado } = require('../erros');

// Guarda só os dígitos, para "(19) 99999-0000" e "19999990000" serem o mesmo login.
const normalizarTelefone = (telefone) => String(telefone || '').replace(/\D/g, '');

// PIN de 4 dígitos sorteado com gerador criptográfico.
const gerarPin = () => String(crypto.randomInt(0, 10000)).padStart(4, '0');

async function buscarEntregador(id) {
  const entregador = await Entregador.findByPk(id);
  if (!entregador) throw naoEncontrado('Entregador');
  return entregador;
}

function listarEntregadores() {
  return Entregador.findAll({ order: [['nome', 'ASC']] });
}

// Devolve o PIN em texto uma única vez, para a atendente passar ao entregador.
// No banco fica só o hash (RNF09).
async function criarEntregador({ nome, telefone }) {
  const tel = normalizarTelefone(telefone);
  if (!nome || !String(nome).trim()) throw new ErroNegocio(422, 'Nome é obrigatório');
  if (tel.length < 8) throw new ErroNegocio(422, 'Telefone inválido');
  if (await Entregador.findOne({ where: { telefone: tel } })) {
    throw new ErroNegocio(409, 'Já existe um entregador com este telefone');
  }
  const pin = gerarPin();
  const criado = await Entregador.create({
    nome: String(nome).trim(),
    telefone: tel,
    pinHash: await bcrypt.hash(pin, 10),
  });
  return { entregador: await buscarEntregador(criado.id), pin };
}

async function trocarPin(id) {
  await buscarEntregador(id);
  const pin = gerarPin();
  await Entregador.update({ pinHash: await bcrypt.hash(pin, 10) }, { where: { id } });
  return { pin };
}

// A atendente só alterna entre disponível e fora de serviço; "em rota" é
// definido pelo despacho e pela conclusão da rota.
async function alterarSituacao(id, situacao) {
  const entregador = await buscarEntregador(id);
  const permitidas = [SITUACAO_ENTREGADOR.DISPONIVEL, SITUACAO_ENTREGADOR.FORA_DE_SERVICO];
  if (!permitidas.includes(situacao)) {
    throw new ErroNegocio(422, `Situação deve ser ${permitidas.join(' ou ')}`);
  }
  const rotaNaRua = await Rota.findOne({ where: { entregadorId: id, status: STATUS_ROTA.DESPACHADA } });
  if (rotaNaRua) throw new ErroNegocio(409, 'Entregador está com uma rota na rua');
  await entregador.update({ situacao });
  return entregador;
}

module.exports = {
  normalizarTelefone,
  gerarPin,
  buscarEntregador,
  listarEntregadores,
  criarEntregador,
  trocarPin,
  alterarSituacao,
};
