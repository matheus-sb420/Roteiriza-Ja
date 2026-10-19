'use strict';

// Pedido (seção 4.1 e contrato da seção 9.2).
// O código que o cliente informa na entrega NÃO tem coluna: ele nunca é guardado (RN22).
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pedidos', {
      // RN01: ID interno único; o código da plataforma pode se repetir.
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      plataforma: { type: Sequelize.STRING, allowNull: false },
      codigo_exibicao: { type: Sequelize.STRING, allowNull: false },
      // RN02: SIMULADOR, MANUAL ou a plataforma do conector (ex.: IFOOD).
      origem: { type: Sequelize.STRING, allowNull: false },

      // Dados do cliente: podem virar NULL quando o prazo da LGPD vence (RN20).
      cliente_nome: { type: Sequelize.STRING, allowNull: true },
      cliente_telefone: { type: Sequelize.STRING, allowNull: true },
      endereco: { type: Sequelize.STRING, allowNull: true },
      dados_cliente_apagados_em: { type: Sequelize.DATE, allowNull: true },

      // RN03: sem coordenadas o pedido não entra.
      latitude: { type: Sequelize.DOUBLE, allowNull: false },
      longitude: { type: Sequelize.DOUBLE, allowNull: false },
      // Setor calculado a partir das coordenadas (seção 4.5).
      anel: { type: Sequelize.INTEGER, allowNull: true },
      fatia: { type: Sequelize.STRING(2), allowNull: true },

      horario_pedido: { type: Sequelize.DATE, allowNull: false },
      horario_prometido: { type: Sequelize.DATE, allowNull: false },
      tipo_entrega: { type: Sequelize.STRING, allowNull: false },
      exige_codigo: { type: Sequelize.BOOLEAN, allowNull: false },
      localizador: { type: Sequelize.STRING, allowNull: true },

      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'em_preparo' },
      // Usados nos indicadores da noite (RF19).
      horario_pronto: { type: Sequelize.DATE, allowNull: true },
      horario_entrega: { type: Sequelize.DATE, allowNull: true },
      // RN25: motivo registrado pela atendente ao resolver um pendente.
      motivo_problema: { type: Sequelize.TEXT, allowNull: true },

      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addConstraint('pedidos', {
      type: 'check',
      fields: ['status'],
      where: {
        status: ['em_preparo', 'pronto', 'em_rota', 'entregue', 'pendente_confirmacao', 'cancelado'],
      },
      name: 'pedidos_status_check',
    });
    await queryInterface.addConstraint('pedidos', {
      type: 'check',
      fields: ['tipo_entrega'],
      where: { tipo_entrega: ['propria', 'plataforma'] },
      name: 'pedidos_tipo_entrega_check',
    });
    await queryInterface.addConstraint('pedidos', {
      type: 'check',
      fields: ['fatia'],
      where: { fatia: ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'] },
      name: 'pedidos_fatia_check',
    });

    await queryInterface.addIndex('pedidos', ['status']);
    await queryInterface.addIndex('pedidos', ['origem']);
    // Usado pela rotina que apaga dados de clientes vencidos (RN20).
    await queryInterface.addIndex('pedidos', ['horario_pedido']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pedidos');
  },
};
