const { STATUS_ROTA, ORIGEM_ROTA } = require('../nucleo/constantes');

module.exports = (sequelize, DataTypes) => {
  const Rota = sequelize.define(
    'Rota',
    {
      origem: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isIn: [Object.values(ORIGEM_ROTA)] },
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: STATUS_ROTA.EM_MONTAGEM,
        validate: { isIn: [Object.values(STATUS_ROTA)] },
      },
      horarioSaida: { type: DataTypes.DATE, allowNull: true },
      horarioConclusao: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'rotas' },
  );

  Rota.associate = (models) => {
    Rota.belongsTo(models.Entregador, { foreignKey: 'entregadorId', as: 'entregador' });
    Rota.hasMany(models.Parada, { foreignKey: 'rotaId', as: 'paradas', onDelete: 'CASCADE' });
  };

  return Rota;
};
