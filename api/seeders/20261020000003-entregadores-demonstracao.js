'use strict';

// Entregadores para a apresentação, com PIN conhecido para entrar no app sem
// precisar anotar. Em uso real, cadastre pela tela e apague estes.
const bcrypt = require('bcryptjs');

const ENTREGADORES = [
  { nome: 'Carlos', telefone: '19900000001', pin: '1111' },
  { nome: 'Fernanda', telefone: '19900000002', pin: '2222' },
  { nome: 'Rodrigo', telefone: '19900000003', pin: '3333' },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const agora = new Date();
    const linhas = [];
    for (const e of ENTREGADORES) {
      linhas.push({
        nome: e.nome,
        telefone: e.telefone,
        pin_hash: await bcrypt.hash(e.pin, 10),
        situacao: 'disponivel',
        created_at: agora,
        updated_at: agora,
      });
    }
    await queryInterface.bulkInsert('entregadores', linhas);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('entregadores', { telefone: ENTREGADORES.map((e) => e.telefone) });
  },
};
