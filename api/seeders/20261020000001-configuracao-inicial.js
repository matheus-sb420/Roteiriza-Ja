'use strict';

// Configuração inicial. As coordenadas são aproximadas (bairro Chácara da Barra,
// Campinas) e os tempos por anel são fictícios: ajuste na tela de Configurações.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const agora = new Date();
    await queryInterface.bulkInsert(
      'configuracoes',
      [
        {
          endereco_pizzaria: 'Chácara da Barra, Campinas - SP',
          latitude_pizzaria: -22.9099,
          longitude_pizzaria: -47.0526,
          raio_maximo_km: 8,
          tempos_por_anel_min: JSON.stringify([10, 15, 20, 25, 30, 35]),
          limite_critico_min: 10,
          prazo_retencao_dias: 30,
          modo_demonstracao: true,
          created_at: agora,
          updated_at: agora,
        },
      ],
      {},
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('configuracoes', null, {});
  },
};
