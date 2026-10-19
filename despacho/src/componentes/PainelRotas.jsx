import { useState } from 'react';
import { URGENCIA, STATUS, formatarFolga, hora } from '../formatar';

function ParadaResumo({ pedido, ordem }) {
  const u = URGENCIA[pedido.classificacao];
  return (
    <>
      <span className="ordem">{ordem}</span>
      <span className={pedido.status === 'cancelado' ? 'riscado' : ''}>
        {pedido.plataforma} {pedido.codigoExibicao}
      </span>
      <span className={`urgencia urgencia-${pedido.classificacao}`}>
        {u.simbolo} {formatarFolga(pedido.folga)}
      </span>
      {pedido.status !== 'pronto' && <span className={`status status-${pedido.status}`}>{STATUS[pedido.status]}</span>}
    </>
  );
}

// Entregas pendentes de confirmação, no topo e em destaque (RF21).
function Pendentes({ pendentes, aoResolver }) {
  if (pendentes.length === 0) return null;
  return (
    <section className="bloco bloco-alerta">
      <h3>⚠ Entregas pendentes de confirmação ({pendentes.length})</h3>
      {pendentes.map((p) => (
        <div key={p.id} className="linha-pendente">
          <span>
            {p.plataforma} {p.codigoExibicao} — {p.endereco}
          </span>
          <div className="botoes">
            <button className="primario" onClick={() => aoResolver(p, { entregue: true })}>
              Foi entregue
            </button>
            <button
              onClick={() => {
                const motivo = window.prompt('Qual foi o problema com esta entrega?');
                if (motivo) aoResolver(p, { motivo });
              }}
            >
              Registrar problema
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}

function Sugestoes({ sugestoes, cores, aoAceitar, aoDescartar }) {
  if (!sugestoes) return null;
  return (
    <section className="bloco">
      <h3>Sugestões</h3>
      {sugestoes.length === 0 && <p className="vazio">Não há pedidos prontos para sugerir.</p>}
      {sugestoes.map((s, i) => (
        <div key={s.ancoraId} className="cartao-rota" style={{ borderLeftColor: cores[i] }}>
          <ol className="paradas">
            {s.pedidos.map((p, j) => (
              <li key={p.id}>
                <ParadaResumo pedido={p} ordem={j + 1} />
              </li>
            ))}
          </ol>
          <div className="botoes">
            <button className="primario" onClick={() => aoAceitar(s)}>
              Aceitar
            </button>
            <button onClick={() => aoDescartar(s)}>Descartar</button>
          </div>
        </div>
      ))}
    </section>
  );
}

function RotaEmMontagem({ rota, cor, disponiveis, totalSelecionados, acoes }) {
  const [entregadorId, setEntregadorId] = useState('');
  const escolhido = entregadorId || (disponiveis[0] ? String(disponiveis[0].id) : '');
  const ids = rota.paradas.map((p) => p.pedido.id);

  const mover = (de, para) => {
    const nova = [...ids];
    [nova[de], nova[para]] = [nova[para], nova[de]];
    acoes.atualizarParadas(rota, nova);
  };

  return (
    <div className="cartao-rota" style={{ borderLeftColor: cor }}>
      <div className="cabecalho-rota">
        <strong>Rota #{rota.id}</strong>
        <small>{rota.origem === 'sugerida' ? 'sugerida' : 'manual'} · em montagem</small>
      </div>
      <ol className="paradas">
        {rota.paradas.map((parada, i) => (
          <li key={parada.pedido.id}>
            <ParadaResumo pedido={parada.pedido} ordem={parada.ordem} />
            <span className="botoes-mini">
              <button disabled={i === 0} onClick={() => mover(i, i - 1)} title="Subir">
                ↑
              </button>
              <button disabled={i === ids.length - 1} onClick={() => mover(i, i + 1)} title="Descer">
                ↓
              </button>
              <button
                onClick={() =>
                  ids.length === 1
                    ? acoes.desfazer(rota)
                    : acoes.atualizarParadas(rota, ids.filter((id) => id !== parada.pedido.id))
                }
                title="Tirar da rota"
              >
                ✕
              </button>
            </span>
          </li>
        ))}
      </ol>
      {totalSelecionados > 0 && (
        <button onClick={() => acoes.adicionarSelecionados(rota)}>+ Adicionar {totalSelecionados} selecionado(s)</button>
      )}
      <div className="despachar">
        <select value={escolhido} onChange={(e) => setEntregadorId(e.target.value)}>
          {disponiveis.length === 0 && <option value="">Nenhum entregador disponível</option>}
          {disponiveis.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </select>
        <button className="primario" disabled={!escolhido} onClick={() => acoes.despachar(rota, Number(escolhido))}>
          Despachar
        </button>
        <button className="discreto" onClick={() => acoes.desfazer(rota)}>
          Desfazer
        </button>
      </div>
    </div>
  );
}

function RotaDespachada({ rota, cor, aoConcluir }) {
  return (
    <div className="cartao-rota" style={{ borderLeftColor: cor }}>
      <div className="cabecalho-rota">
        <strong>
          Rota #{rota.id} · {rota.entregador?.nome}
        </strong>
        <small>saiu {hora(rota.horarioSaida)}</small>
      </div>
      <ol className="paradas">
        {rota.paradas.map((parada) => (
          <li key={parada.pedido.id} className={parada.pedido.status === 'cancelado' ? 'alerta-cancelado' : ''}>
            <ParadaResumo pedido={parada.pedido} ordem={parada.ordem} />
          </li>
        ))}
      </ol>
      <button className="discreto" onClick={() => aoConcluir(rota)}>
        Concluir manualmente
      </button>
    </div>
  );
}

// Lateral direita: pendentes, sugestões, rotas em montagem e despachadas.
export default function PainelRotas({
  rotas,
  sugestoes,
  pendentes,
  entregadores,
  coresPorRota,
  coresSugestoes,
  totalSelecionados,
  acoes,
}) {
  const emMontagem = rotas.filter((r) => r.status === 'em_montagem');
  const despachadas = rotas.filter((r) => r.status === 'despachada');
  const disponiveis = entregadores.filter((e) => e.situacao === 'disponivel');

  return (
    <aside className="lateral lateral-direita">
      <Pendentes pendentes={pendentes} aoResolver={acoes.resolver} />
      <Sugestoes sugestoes={sugestoes} cores={coresSugestoes} aoAceitar={acoes.aceitar} aoDescartar={acoes.descartar} />

      <section className="bloco">
        <h3>Em montagem ({emMontagem.length})</h3>
        {totalSelecionados > 0 && (
          <button className="primario largo" onClick={acoes.montarManual}>
            Montar rota com {totalSelecionados} pedido(s) selecionado(s)
          </button>
        )}
        {emMontagem.length === 0 && totalSelecionados === 0 && (
          <p className="vazio">Aceite uma sugestão ou selecione pedidos na lista ou no mapa.</p>
        )}
        {emMontagem.map((rota) => (
          <RotaEmMontagem
            key={rota.id}
            rota={rota}
            cor={coresPorRota[rota.id]}
            disponiveis={disponiveis}
            totalSelecionados={totalSelecionados}
            acoes={acoes}
          />
        ))}
      </section>

      <section className="bloco">
        <h3>Na rua ({despachadas.length})</h3>
        {despachadas.map((rota) => (
          <RotaDespachada key={rota.id} rota={rota} cor={coresPorRota[rota.id]} aoConcluir={acoes.concluir} />
        ))}
      </section>
    </aside>
  );
}
