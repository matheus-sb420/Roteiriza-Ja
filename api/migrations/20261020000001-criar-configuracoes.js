'use strict';

// Configuração da pizzaria (seção 4.4). A tabela tem uma linha só.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('configuracoes', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      endereco_pizzaria: { type: Sequelize.STRING, allowNull: false },
      latitude_pizzaria: { type: Sequelize.DOUBLE, allowNull: false },
      longitude_pizzaria: { type: Sequelize.DOUBLE, allowNull: false },
      // RN09: anéis de 2 km, raio máximo de até 12 km (6 anéis).
      raio_maximo_km: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 8 },
      // Tempo médio de trajeto, em minutos, de cada anel: posição 0 = anel 1.
      tempos_por_anel_min: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [10, 15, 20, 25, 30, 35],
      },
      // RN08: folga entre 0 e este limite = "crítico".
      limite_critico_min: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 10 },
      // RN20: dias até apagar nome, telefone e endereço do cliente.
      prazo_retencao_dias: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 30 },
      modo_demonstracao: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addConstraint('configuracoes', {
      type: 'check',
      fields: ['raio_maximo_km'],
      where: { raio_maximo_km: { [Sequelize.Op.between]: [1, 12] } },
      name: 'configuracoes_raio_maximo_km_check',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('configuracoes');
  },
};
