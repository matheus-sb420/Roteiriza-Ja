'use strict';

// Usuários do sistema de despacho (RF01). A senha nunca é guardada em texto puro (RNF09).
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('administradores', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      usuario: { type: Sequelize.STRING, allowNull: false, unique: true },
      senha_hash: { type: Sequelize.STRING, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('administradores');
  },
};
