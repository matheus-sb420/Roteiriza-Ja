import { api } from '../api';
import { usePolling } from '../usePolling';
import { hora } from '../formatar';

// RF19: indicadores da noite.
export default function Indicadores() {
  const { dados } = usePolling(() => api('/api/painel/indicadores'), 30000);
  if (!dados) return <p className="carregando">Carregando…</p>;

  const cartoes = [
    ['Pedidos da noite', dados.totalPedidos],
    ['Entregues', dados.entregues],
    ['Entregues com atraso', dados.entreguesComAtraso],
    ['Cancelados', dados.cancelados],
    ['Rotas despachadas', dados.rotasDespachadas],
    ['Entregas pendentes', dados.entregasPendentes],
    [
      'Tempo médio entre “pronto” e despacho',
      dados.tempoMedioProntoDespachoMin === null ? '—' : `${dados.tempoMedioProntoDespachoMin} min`,
    ],
  ];

  return (
    <main className="pagina">
      <h1>Indicadores da noite</h1>
      <p className="dica">Desde {hora(dados.desde)} (últimas 12 horas).</p>
      <div className="cartoes-indicadores">
        {cartoes.map(([nome, valor]) => (
          <div key={nome} className="cartao-indicador">
            <span className="valor">{valor}</span>
            <span>{nome}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
