module.exports = (sequelize, DataTypes) => {
  const Parada = sequelize.define(
    'Parada',
    {
      ordem: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
      tentativasCodigo: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
    },
    { tableName: 'paradas' },
  );

  Parada.associate = (models) => {
    Parada.belongsTo(models.Rota, { foreignKey: 'rotaId', as: 'rota' });
    Parada.belongsTo(models.Pedido, { foreignKey: 'pedidoId', as: 'pedido' });
  };

  return Parada;
};
