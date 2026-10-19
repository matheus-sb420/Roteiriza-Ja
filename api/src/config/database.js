// Configuração de conexão usada pelos models e pelo sequelize-cli.
require('dotenv').config({ quiet: true });

const base = {
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  // Horários sempre em UTC no banco; as telas convertem para America/Sao_Paulo.
  timezone: '+00:00',
  logging: false,
  define: {
    // Atributos em camelCase no código, colunas em snake_case no banco.
    underscored: true,
  },
};

module.exports = {
  development: { ...base, database: process.env.DB_NAME || 'roteiriza_ja' },
  test: { ...base, database: process.env.DB_NAME_TEST || 'roteiriza_ja_test' },
  production: { ...base, database: process.env.DB_NAME || 'roteiriza_ja' },
};
