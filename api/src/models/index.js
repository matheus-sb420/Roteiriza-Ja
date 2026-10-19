// Cria a conexão e registra todos os models com suas associações.
const { Sequelize, DataTypes } = require('sequelize');
const configs = require('../config/database');

const ambiente = process.env.NODE_ENV || 'development';
const config = configs[ambiente];

const sequelize = new Sequelize(config.database, config.username, config.password, config);

const models = {
  Configuracao: require('./configuracao')(sequelize, DataTypes),
  Administrador: require('./administrador')(sequelize, DataTypes),
  Entregador: require('./entregador')(sequelize, DataTypes),
  Pedido: require('./pedido')(sequelize, DataTypes),
  Rota: require('./rota')(sequelize, DataTypes),
  Parada: require('./parada')(sequelize, DataTypes),
};

Object.values(models).forEach((model) => {
  if (model.associate) model.associate(models);
});

module.exports = { sequelize, Sequelize, ...models };
