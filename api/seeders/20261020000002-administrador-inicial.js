'use strict';

// Cria o primeiro administrador. Usuário e senha vêm do .env (ADMIN_USUARIO e
// ADMIN_SENHA); só o hash bcrypt é gravado (RNF09).
require('dotenv').config({ quiet: true });
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const agora = new Date();
    const usuario = process.env.ADMIN_USUARIO || 'admin';
    const senha = process.env.ADMIN_SENHA || 'admin123';
    await queryInterface.bulkInsert('administradores', [
      {
        usuario,
        senha_hash: await bcrypt.hash(senha, 10),
        created_at: agora,
        updated_at: agora,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('administradores', null, {});
  },
};
