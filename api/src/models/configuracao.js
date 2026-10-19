module.exports = (sequelize, DataTypes) => {
  const Configuracao = sequelize.define(
    'Configuracao',
    {
      enderecoPizzaria: { type: DataTypes.STRING, allowNull: false },
      latitudePizzaria: { type: DataTypes.DOUBLE, allowNull: false, validate: { min: -90, max: 90 } },
      longitudePizzaria: { type: DataTypes.DOUBLE, allowNull: false, validate: { min: -180, max: 180 } },
      raioMaximoKm: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 8,
        validate: { min: 1, max: 12 },
      },
      temposPorAnelMin: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [10, 15, 20, 25, 30, 35],
        validate: {
          // Precisa de um tempo positivo para cada anel dentro do raio máximo (RN09).
          umTempoPorAnel(tempos) {
            if (!Array.isArray(tempos) || tempos.some((t) => !Number.isFinite(t) || t <= 0)) {
              throw new Error('temposPorAnelMin deve ser uma lista de minutos positivos');
            }
            if (tempos.length < Math.ceil(this.raioMaximoKm / 2)) {
              throw new Error('temposPorAnelMin deve ter um tempo para cada anel até o raio máximo');
            }
          },
        },
      },
      limiteCriticoMin: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10, validate: { min: 0 } },
      prazoRetencaoDias: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30, validate: { min: 1 } },
      modoDemonstracao: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'configuracoes' },
  );

  return Configuracao;
};
