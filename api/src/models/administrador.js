module.exports = (sequelize, DataTypes) => {
  const Administrador = sequelize.define(
    'Administrador',
    {
      usuario: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { notEmpty: true } },
      senhaHash: { type: DataTypes.STRING, allowNull: false },
    },
    {
      tableName: 'administradores',
      // O hash nunca sai da API por engano num res.json().
      defaultScope: { attributes: { exclude: ['senhaHash'] } },
      scopes: { comSenha: { attributes: { include: ['senhaHash'] } } },
    },
  );

  return Administrador;
};
