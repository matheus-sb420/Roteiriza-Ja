// O "motor" do simulador: imita as plataformas de delivery.
// Fala com a API só pelas portas públicas (Apêndice A.3):
//   - envia pedidos, "pronto" e cancelamentos pela porta de entrada;
//   - recebe "em rota", "entregue" e "validar código" pela porta de saída.
const { PARAMETROS_PADRAO, gerarPedido } = require('./gerador');

class Simulador {
  constructor({ apiUrl, chaveFonte, buscar = fetch, sortear = Math.random }) {
    this.apiUrl = apiUrl;
    this.chaveFonte = chaveFonte;
    this.buscar = buscar;
    this.sortear = sortear;
    this.parametros = structuredClone(PARAMETROS_PADRAO);
    this.rodando = false;
    this.modoDemonstracao = null;
    this.pedidos = new Map(); // id interno da API → pedido simulado
    this.registro = [];
  }

  anotar(texto) {
    this.registro.unshift({ horario: new Date(), texto });
    this.registro.length = Math.min(this.registro.length, 50);
  }

  async chamarEntrada(metodo, caminho, corpo) {
    const resposta = await this.buscar(`${this.apiUrl}/entrada${caminho}`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', 'x-chave-fonte': this.chaveFonte },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    if (!resposta.ok) {
      const erro = await resposta.json().catch(() => ({}));
      throw new Error(`${resposta.status} ${erro.erro || ''} ${(erro.detalhes || []).join('; ')}`.trim());
    }
    return resposta.status === 204 ? null : resposta.json();
  }

  // RF18: o modo demonstração, ligado nas configurações do despacho, decide se
  // o simulador pode gerar pedidos.
  async lerConfiguracao() {
    const config = await this.chamarEntrada('GET', '/configuracao');
    this.modoDemonstracao = config.modoDemonstracao;
    return config;
  }

  async criarPedido(config, agora = new Date()) {
    const { contrato, segredo } = gerarPedido(this.parametros, config, agora, this.sortear);
    const { id, foraDaArea } = await this.chamarEntrada('POST', '/pedidos', contrato);
    this.pedidos.set(id, {
      id,
      plataforma: contrato.plataforma,
      codigoExibicao: contrato.codigoExibicao,
      endereco: contrato.endereco,
      tipoEntrega: contrato.tipoEntrega,
      exigeCodigo: contrato.exigeCodigo,
      horarioPrometido: contrato.horarioPrometido,
      status: 'em_preparo',
      foraDaArea,
      ...segredo,
    });
    this.anotar(`Novo pedido ${contrato.plataforma} ${contrato.codigoExibicao} (#${id})`);
    return this.pedidos.get(id);
  }

  async gerarLote(quantidade) {
    const config = await this.lerConfiguracao();
    if (!config.modoDemonstracao) throw new Error('Modo demonstração desligado nas configurações');
    const criados = [];
    for (let i = 0; i < quantidade; i++) criados.push(await this.criarPedido(config));
    return criados;
  }

  async marcarPronto(id) {
    await this.chamarEntrada('POST', `/pedidos/${id}/pronto`, { origem: 'SIMULADOR' });
    this.pedidos.get(id).status = 'pronto';
    this.anotar(`Pedido #${id} pronto`);
  }

  async cancelar(id) {
    await this.chamarEntrada('POST', `/pedidos/${id}/cancelado`, { origem: 'SIMULADOR' });
    this.pedidos.get(id).status = 'cancelado';
    this.anotar(`Pedido #${id} cancelado pelo cliente`);
  }

  // Executado a cada poucos segundos: novos pedidos, "pronto" automático e cancelamentos.
  async passo(intervaloMs, agora = new Date()) {
    const config = await this.lerConfiguracao();
    if (!config.modoDemonstracao || !this.rodando) return;

    // Em média "pedidosPorHora" por hora, com variação aleatória.
    const esperados = (this.parametros.pedidosPorHora * intervaloMs) / (60 * 60 * 1000);
    const novos = Math.floor(esperados + this.sortear());
    for (let i = 0; i < novos; i++) await this.criarPedido(config, agora);

    for (const pedido of this.pedidos.values()) {
      const aberto = ['em_preparo', 'pronto'].includes(pedido.status);
      if (aberto && pedido.cancelarEm && pedido.cancelarEm <= agora) {
        await this.cancelar(pedido.id).catch((e) => this.anotar(`Falha ao cancelar #${pedido.id}: ${e.message}`));
      } else if (this.parametros.autoPronto && pedido.status === 'em_preparo' && pedido.prontoEm <= agora) {
        await this.marcarPronto(pedido.id).catch((e) => this.anotar(`Falha ao marcar #${pedido.id}: ${e.message}`));
      }
    }
  }

  // ---- Porta de saída: mensagens que a API envia ----

  pedidoEmRota({ pedidoId }) {
    const pedido = this.pedidos.get(pedidoId);
    if (pedido) pedido.status = 'em_rota';
    this.anotar(`Pedido #${pedidoId} saiu para entrega`);
  }

  pedidoEntregue({ pedidoId }) {
    const pedido = this.pedidos.get(pedidoId);
    if (pedido) pedido.status = 'entregue';
    this.anotar(`Pedido #${pedidoId} entregue`);
  }

  // Responde como uma plataforma faria. "foraDoAr" simula a plataforma sem
  // resposta, para testar a regra das 3 tentativas (RN24).
  validarCodigo({ pedidoId, codigo }) {
    if (this.parametros.foraDoAr) {
      this.anotar(`Validação do #${pedidoId} recusada: plataforma fora do ar`);
      return null;
    }
    const pedido = this.pedidos.get(pedidoId);
    const valido = Boolean(pedido) && pedido.codigoCliente === String(codigo);
    this.anotar(`Código do #${pedidoId} ${valido ? 'válido' : 'inválido'}`);
    return { valido };
  }

  estado() {
    return {
      rodando: this.rodando,
      modoDemonstracao: this.modoDemonstracao,
      parametros: this.parametros,
      pedidos: [...this.pedidos.values()].reverse().slice(0, 200),
      registro: this.registro,
    };
  }
}

module.exports = { Simulador };
