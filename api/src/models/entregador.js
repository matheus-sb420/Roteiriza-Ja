const { SITUACAO_ENTREGADOR } = require('../nucleo/constantes');

module.exports = (sequelize, DataTypes) => {
  const Entregador = sequelize.define(
    'Entregador',
    {
      nome: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: true } },
      telefone: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { notEmpty: true } },
      pinHash: { type: DataTypes.STRING, allowNull: false },
      situacao: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: SITUACAO_ENTREGADOR.DISPONIVEL,
        validate: { isIn: [Object.values(SITUACAO_ENTREGADOR)] },
      },
    },
    {
      tableName: 'entregadores',
      defaultScope: { attributes: { exclude: ['pinHash'] } },
      scopes: { comPin: { attributes: { include: ['pinHash'] } } },
    },
  );

  Entregador.associate = (models) => {
    Entregador.hasMany(models.Rota, { foreignKey: 'entregadorId', as: 'rotas' });
  };

  return Entregador;
};
