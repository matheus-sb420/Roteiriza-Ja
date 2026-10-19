'use strict';

// Parada = um pedido dentro de uma rota, com a sua posição na ordem de entrega.
// É a tabela que liga rotas e pedidos (a "lista ordenada de paradas" da seção 4.2).
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('paradas', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      rota_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'rotas', key: 'id' },
        onUpdate: 'CASCADE',
        // RN17: desfazer uma rota apaga suas paradas e libera os pedidos.
        onDelete: 'CASCADE',
      },
      pedido_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'pedidos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      // 1 = primeira entrega (RN14).
      ordem: { type: Sequelize.INTEGER, allowNull: false },
      // RN24: após 3 códigos inválidos, o pedido vira "pendente de confirmação".
      tentativas_codigo: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addConstraint('paradas', {
      type: 'unique',
      fields: ['rota_id', 'pedido_id'],
      name: 'paradas_rota_pedido_unico',
    });
    await queryInterface.addIndex('paradas', ['pedido_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('paradas');
  },
};
