// Erro de regra de negócio: vira uma resposta HTTP com status e mensagem claros.
class ErroNegocio extends Error {
  constructor(status, mensagem, detalhes) {
    super(mensagem);
    this.status = status;
    this.detalhes = detalhes;
  }
}

const naoEncontrado = (o) => new ErroNegocio(404, `${o} não encontrado`);

module.exports = { ErroNegocio, naoEncontrado };
