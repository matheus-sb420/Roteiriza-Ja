import { useMemo, useState } from 'react';
import { api } from '../api';
import { usePolling } from '../usePolling';
import { corDaRota } from '../formatar';
import Mapa from '../componentes/Mapa';
import Legenda from '../componentes/Legenda';
import ListaPedidos from '../componentes/ListaPedidos';
import PainelRotas from '../componentes/PainelRotas';
import CadastroPedido from '../componentes/CadastroPedido';

// RNF06: um pedido novo aparece em até 10 s; consultar a cada 5 s dá folga.
const INTERVALO_MS = 5000;

// Tela principal de despacho (seção 11.1).
export default function Despacho() {
  const { dados, erro, recarregar } = usePolling(() => api('/api/painel'), INTERVALO_MS);
  const [limite, setLimite] = useState(3);
  const [sugestoes, setSugestoes] = useState(null);
  const [selecionados, setSelecionados] = useState(new Set());
  const [mostrarSetores, setMostrarSetores] = useState(true);
  const [modoCadastro, setModoCadastro] = useState(false);
  const [localCadastro, setLocalCadastro] = useState(null);
  const [aviso, setAviso] = useState('');

  const rotas = dados?.rotas ?? [];
  const pedidos = dados?.pedidos ?? [];

  // Cada rota aberta ganha uma cor; as sugestões usam as cores seguintes.
  const coresPorRota = useMemo(
    () => Object.fromEntries(rotas.map((r, i) => [r.id, corDaRota(i)])),
    [rotas],
  );
  const coresSugestoes = (sugestoes ?? []).map((_, i) => corDaRota(rotas.length + i));

  const linhas = [
    ...rotas.map((r) => ({
      chave: `rota-${r.id}`,
      cor: coresPorRota[r.id],
      pontos: r.paradas.filter((p) => p.pedido.status !== 'cancelado').map((p) => [p.pedido.latitude, p.pedido.longitude]),
    })),
    ...(sugestoes ?? []).map((s, i) => ({
      chave: `sugestao-${s.ancoraId}`,
      cor: coresSugestoes[i],
      tracejada: true,
      pontos: s.pedidos.map((p) => [p.latitude, p.longitude]),
    })),
  ];

  // Executa uma ação, mostra o erro (se houver) e atualiza a tela.
  async function executar(acao) {
    try {
      setAviso('');
      await acao();
    } catch (e) {
      setAviso(e.detalhes && Array.isArray(e.detalhes) ? `${e.message}: ${e.detalhes.join('; ')}` : e.message);
    }
    await recarregar();
  }

  const alternarSelecao = (id) => {
    const novo = new Set(selecionados);
    if (novo.has(id)) novo.delete(id);
    else novo.add(id);
    setSelecionados(novo);
  };

  const marcarPronto = (pedido, pronto) =>
    executar(() => api(`/api/pedidos/${pedido.id}/pronto`, { metodo: 'POST', corpo: { pronto } }));

  // RNF03: clicar no pino em preparo marca como pronto; no pino pronto e livre,
  // seleciona para montar rota manual.
  function clicarPino(pedido) {
    if (pedido.tipoEntrega === 'plataforma') return;
    if (pedido.status === 'em_preparo') marcarPronto(pedido, true);
    else if (pedido.status === 'pronto' && !pedido.rotaId) alternarSelecao(pedido.id);
  }

  const descartarDasSugestoes = (ids) =>
    setSugestoes((atuais) => atuais && atuais.filter((s) => !s.pedidoIds.some((id) => ids.includes(id))));

  const acoes = {
    aceitar: (s) =>
      executar(async () => {
        await api('/api/rotas', { metodo: 'POST', corpo: { pedidoIds: s.pedidoIds, origem: 'sugerida' } });
        descartarDasSugestoes(s.pedidoIds);
      }),
    descartar: (s) => setSugestoes(sugestoes.filter((x) => x !== s)),
    montarManual: () =>
      executar(async () => {
        const ids = [...selecionados];
        await api('/api/rotas', { metodo: 'POST', corpo: { pedidoIds: ids, origem: 'manual' } });
        setSelecionados(new Set());
        descartarDasSugestoes(ids);
      }),
    adicionarSelecionados: (rota) =>
      executar(async () => {
        const ids = [...rota.paradas.map((p) => p.pedido.id), ...selecionados];
        await api(`/api/rotas/${rota.id}/paradas`, { metodo: 'PUT', corpo: { pedidoIds: ids } });
        setSelecionados(new Set());
      }),
    atualizarParadas: (rota, pedidoIds) =>
      executar(() => api(`/api/rotas/${rota.id}/paradas`, { metodo: 'PUT', corpo: { pedidoIds } })),
    desfazer: (rota) => executar(() => api(`/api/rotas/${rota.id}`, { metodo: 'DELETE' })),
    // RN06: se houver pedido em preparo, a API devolve um aviso e a atendente decide.
    despachar: (rota, entregadorId) =>
      executar(async () => {
        try {
          await api(`/api/rotas/${rota.id}/despachar`, { metodo: 'POST', corpo: { entregadorId } });
        } catch (e) {
          if (!e.detalhes?.precisaConfirmar) throw e;
          const resumo = e.detalhes.pedidos
            .map((p) => `• ${p.codigoExibicao}: ${p.status === 'em_preparo' ? 'EM PREPARO' : 'pronto'}, folga ${p.folga} min`)
            .join('\n');
          const ok = window.confirm(`Há pedidos que ainda não estão prontos:\n\n${resumo}\n\nDespachar mesmo assim?`);
          if (ok) {
            await api(`/api/rotas/${rota.id}/despachar`, { metodo: 'POST', corpo: { entregadorId, confirmado: true } });
          }
        }
      }),
    concluir: (rota) => {
      if (window.confirm(`Concluir a rota #${rota.id}? Paradas sem resposta ficam pendentes.`)) {
        executar(() => api(`/api/rotas/${rota.id}/concluir`, { metodo: 'POST' }));
      }
    },
    resolver: (pedido, corpo) => executar(() => api(`/api/pedidos/${pedido.id}/resolver`, { metodo: 'POST', corpo })),
  };

  async function sugerir() {
    try {
      setAviso('');
      setSugestoes(await api('/api/rotas/sugestoes', { metodo: 'POST', corpo: { limite: Number(limite) } }));
    } catch (e) {
      setAviso(e.message);
    }
  }

  function cancelarPedido(pedido) {
    if (window.confirm(`Cancelar o pedido ${pedido.plataforma} ${pedido.codigoExibicao}?`)) {
      executar(() => api(`/api/pedidos/${pedido.id}/cancelar`, { metodo: 'POST' }));
    }
  }

  async function salvarPedidoManual(pedido) {
    await api('/api/pedidos', { metodo: 'POST', corpo: pedido });
    setLocalCadastro(null);
    setModoCadastro(false);
    await recarregar();
  }

  if (!dados) return <p className="carregando">{erro ? `Erro: ${erro.message}` : 'Carregando…'}</p>;

  const pendentes = pedidos.filter((p) => p.status === 'pendente_confirmacao');
  const { indicadores } = dados;

  return (
    <div className="despacho">
      <header className="topo">
        <label className="campo-limite">
          Pedidos por rota
          <input type="number" min="1" value={limite} onChange={(e) => setLimite(e.target.value)} />
        </label>
        <button className="primario" onClick={sugerir}>
          Sugerir rotas
        </button>
        {sugestoes && sugestoes.length > 0 && <button onClick={() => setSugestoes(null)}>Limpar sugestões</button>}
        <button
          className={modoCadastro ? 'ativo' : ''}
          onClick={() => {
            setModoCadastro(!modoCadastro);
            setLocalCadastro(null);
          }}
        >
          {modoCadastro ? 'Clique no mapa onde é a entrega…' : '+ Novo pedido'}
        </button>
        <label className="checkbox">
          <input type="checkbox" checked={mostrarSetores} onChange={(e) => setMostrarSetores(e.target.checked)} />
          Anéis e fatias
        </label>
        <div className="indicadores-rapidos">
          <span className="selo selo-atrasado">▲ {indicadores.atrasadosAgora} atrasados agora</span>
          <span className="selo">🛵 {indicadores.rotasNaRua} rotas na rua</span>
          {indicadores.entregasPendentes > 0 && (
            <span className="selo selo-critico">⚠ {indicadores.entregasPendentes} pendentes</span>
          )}
        </div>
        <Legenda limiteCriticoMin={dados.configuracao.limiteCriticoMin} />
      </header>

      {(aviso || erro) && (
        <div className="aviso" onClick={() => setAviso('')}>
          {aviso || `Sem conexão com a API: ${erro.message}`}
        </div>
      )}

      <ListaPedidos
        pedidos={pedidos}
        selecionados={selecionados}
        aoAlternarSelecao={alternarSelecao}
        aoMarcarPronto={marcarPronto}
        aoCancelar={cancelarPedido}
      />

      <main className="centro">
        <Mapa
          configuracao={dados.configuracao}
          pedidos={pedidos.filter((p) => p.status !== 'pendente_confirmacao')}
          linhas={linhas}
          coresPorRota={coresPorRota}
          mostrarSetores={mostrarSetores}
          selecionados={selecionados}
          modoCadastro={modoCadastro}
          localCadastro={localCadastro}
          aoClicarMapa={setLocalCadastro}
          aoClicarPino={clicarPino}
        />
        <p className="dica-mapa">
          Clique num pino <b>em preparo</b> para marcar como pronto; num pino <b>pronto</b> para selecioná-lo para uma
          rota manual.
        </p>
      </main>

      <PainelRotas
        rotas={rotas}
        sugestoes={sugestoes}
        pendentes={pendentes}
        entregadores={dados.entregadores}
        coresPorRota={coresPorRota}
        coresSugestoes={coresSugestoes}
        totalSelecionados={selecionados.size}
        acoes={acoes}
      />

      {localCadastro && (
        <CadastroPedido
          local={localCadastro}
          aoSalvar={salvarPedidoManual}
          aoCancelar={() => {
            setLocalCadastro(null);
            setModoCadastro(false);
          }}
        />
      )}
    </div>
  );
}
