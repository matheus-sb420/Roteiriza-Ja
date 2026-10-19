import { useState } from 'react';
import { URGENCIA, STATUS, formatarFolga, setor, hora } from '../formatar';

const FILTROS = [
  ['ativos', 'Todos'],
  ['em_preparo', 'Em preparo'],
  ['pronto', 'Prontos'],
  ['em_rota', 'Em rota'],
  ['livres', 'Fora de rotas'],
];

// Lateral esquerda: pedidos ordenados pela folga (RF05), com filtros e uma aba
// separada para entrega pela plataforma (RF08).
export default function ListaPedidos({ pedidos, selecionados, aoAlternarSelecao, aoMarcarPronto, aoCancelar }) {
  const [aba, setAba] = useState('propria');
  const [filtro, setFiltro] = useState('ativos');

  const daAba = pedidos.filter((p) => p.tipoEntrega === aba && p.status !== 'pendente_confirmacao');
  const visiveis = daAba.filter((p) => {
    if (filtro === 'ativos') return true;
    if (filtro === 'livres') return !p.rotaId;
    return p.status === filtro;
  });
  const totalPlataforma = pedidos.filter((p) => p.tipoEntrega === 'plataforma').length;

  return (
    <aside className="lateral lateral-esquerda">
      <div className="abas">
        <button className={aba === 'propria' ? 'ativa' : ''} onClick={() => setAba('propria')}>
          Entrega própria
        </button>
        <button className={aba === 'plataforma' ? 'ativa' : ''} onClick={() => setAba('plataforma')}>
          Plataforma ({totalPlataforma})
        </button>
      </div>
      <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
        {FILTROS.map(([valor, nome]) => (
          <option key={valor} value={valor}>
            {nome}
          </option>
        ))}
      </select>

      {visiveis.length === 0 && <p className="vazio">Nenhum pedido.</p>}
      <ul className="lista-pedidos">
        {visiveis.map((p) => {
          const u = URGENCIA[p.classificacao];
          const podeSelecionar = aba === 'propria' && !p.rotaId && ['em_preparo', 'pronto'].includes(p.status);
          return (
            <li key={p.id} className={`item-pedido ${p.status === 'em_preparo' ? 'esmaecido' : ''}`}>
              <span className={`urgencia urgencia-${p.classificacao}`} title={u.nome}>
                {u.simbolo} {formatarFolga(p.folga)}
              </span>
              <div className="item-info">
                <strong>
                  {p.plataforma} {p.codigoExibicao}
                </strong>
                <small>
                  {setor(p)} · prometido {hora(p.horarioPrometido)}
                </small>
                <small>
                  {STATUS[p.status]}
                  {p.rotaId ? ` · rota #${p.rotaId}` : ''}
                </small>
              </div>
              <div className="item-acoes">
                {p.status === 'em_preparo' && (
                  <button className="primario" onClick={() => aoMarcarPronto(p, true)}>
                    Pronto
                  </button>
                )}
                {p.status === 'pronto' && (
                  <button onClick={() => aoMarcarPronto(p, false)} title="Desmarcar pronto">
                    ↺
                  </button>
                )}
                {podeSelecionar && (
                  <label className="seletor" title="Selecionar para rota manual">
                    <input
                      type="checkbox"
                      checked={selecionados.has(p.id)}
                      onChange={() => aoAlternarSelecao(p.id)}
                    />
                    rota
                  </label>
                )}
                {['em_preparo', 'pronto'].includes(p.status) && (
                  <button className="discreto" onClick={() => aoCancelar(p)} title="Cancelar pedido">
                    ✕
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
