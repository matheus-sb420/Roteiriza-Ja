'use strict';

// Rota (seção 4.2). O entregador só é atribuído no despacho, por isso pode ser NULL.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rotas', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      entregador_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'entregadores', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      origem: { type: Sequelize.STRING, allowNull: false },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'em_montagem' },
      horario_saida: { type: Sequelize.DATE, allowNull: true },
      horario_conclusao: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addConstraint('rotas', {
      type: 'check',
      fields: ['origem'],
      where: { origem: ['sugerida', 'manual'] },
      name: 'rotas_origem_check',
    });
    await queryInterface.addConstraint('rotas', {
      type: 'check',
      fields: ['status'],
      where: { status: ['em_montagem', 'despachada', 'concluida'] },
      name: 'rotas_status_check',
    });

    await queryInterface.addIndex('rotas', ['status']);
    await queryInterface.addIndex('rotas', ['entregador_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('rotas');
  },
};
