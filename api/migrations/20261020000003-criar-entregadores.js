'use strict';

// Entregador (seção 4.3). O telefone é o login do app; o PIN fica só como hash (RN21, RNF09).
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('entregadores', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      nome: { type: Sequelize.STRING, allowNull: false },
      telefone: { type: Sequelize.STRING, allowNull: false, unique: true },
      pin_hash: { type: Sequelize.STRING, allowNull: false },
      situacao: { type: Sequelize.STRING, allowNull: false, defaultValue: 'disponivel' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addConstraint('entregadores', {
      type: 'check',
      fields: ['situacao'],
      where: { situacao: ['disponivel', 'em_rota', 'fora_de_servico'] },
      name: 'entregadores_situacao_check',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('entregadores');
  },
};
