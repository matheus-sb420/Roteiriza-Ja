const { STATUS_PEDIDO, TIPO_ENTREGA, FATIAS } = require('../nucleo/constantes');

module.exports = (sequelize, DataTypes) => {
  const Pedido = sequelize.define(
    'Pedido',
    {
      plataforma: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: true } },
      codigoExibicao: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: true } },
      origem: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: true } },

      // Podem virar null quando o prazo de retenção vence (RN20).
      clienteNome: { type: DataTypes.STRING, allowNull: true },
      clienteTelefone: { type: DataTypes.STRING, allowNull: true },
      endereco: { type: DataTypes.STRING, allowNull: true },
      dadosClienteApagadosEm: { type: DataTypes.DATE, allowNull: true },

      latitude: { type: DataTypes.DOUBLE, allowNull: false, validate: { min: -90, max: 90 } },
      longitude: { type: DataTypes.DOUBLE, allowNull: false, validate: { min: -180, max: 180 } },
      anel: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 1 } },
      fatia: { type: DataTypes.STRING(2), allowNull: true, validate: { isIn: [FATIAS] } },

      horarioPedido: { type: DataTypes.DATE, allowNull: false },
      horarioPrometido: { type: DataTypes.DATE, allowNull: false },
      tipoEntrega: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isIn: [Object.values(TIPO_ENTREGA)] },
      },
      exigeCodigo: { type: DataTypes.BOOLEAN, allowNull: false },
      localizador: { type: DataTypes.STRING, allowNull: true },

      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: STATUS_PEDIDO.EM_PREPARO,
        validate: { isIn: [Object.values(STATUS_PEDIDO)] },
      },
      horarioPronto: { type: DataTypes.DATE, allowNull: true },
      horarioEntrega: { type: DataTypes.DATE, allowNull: true },
      motivoProblema: { type: DataTypes.TEXT, allowNull: true },
    },
    { tableName: 'pedidos' },
  );

  Pedido.associate = (models) => {
    Pedido.hasMany(models.Parada, { foreignKey: 'pedidoId', as: 'paradas' });
  };

  return Pedido;
};
