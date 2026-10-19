import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import ConfirmarEntrega from './ConfirmarEntrega';

const INTERVALO_MS = 5000;

const STATUS = {
  em_rota: 'A entregar',
  entregue: 'Entregue',
  pendente_confirmacao: 'Pendente – atendente',
  cancelado: 'Cancelado',
};

// RF24: abre o Google Maps ou o Waze com a localização da parada.
const linkGoogleMaps = (p) => `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`;
const linkWaze = (p) => `https://waze.com/ul?ll=${p.latitude},${p.longitude}&navigate=yes`;

// RF23: paradas na ordem, com a atual em destaque.
export default function MinhaRota({ aoSair }) {
  const [dados, setDados] = useState(null);
  const [aviso, setAviso] = useState(null);

  const carregar = useCallback(async () => {
    try {
      setDados(await api('/app/rota'));
    } catch (e) {
      if (e.status === 401) aoSair();
    }
  }, [aoSair]);

  useEffect(() => {
    carregar();
    const id = setInterval(carregar, INTERVALO_MS);
    return () => clearInterval(id);
  }, [carregar]);

  function aoResolver(resultado) {
    if (resultado.resultado === 'pendente') {
      // RN24: o pedido fica para a atendente e o entregador segue.
      setAviso({ tipo: 'alerta', texto: 'Não foi possível confirmar. Chame a atendente e siga para a próxima parada.' });
    } else if (resultado.rotaConcluida) {
      setAviso({ tipo: 'sucesso', texto: 'Rota concluída! Volte para a pizzaria.' });
    } else {
      setAviso({ tipo: 'sucesso', texto: 'Entrega confirmada.' });
    }
    carregar();
  }

  if (!dados) return <main className="tela">Carregando…</main>;

  const { rota, paradaAtualId } = dados;

  return (
    <main className="tela">
      <header className="cabecalho">
        <h1>Minha rota</h1>
        <button className="sair" onClick={aoSair}>
          Sair
        </button>
      </header>

      {aviso && (
        <div className={`mensagem ${aviso.tipo}`} onClick={() => setAviso(null)}>
          {aviso.tipo === 'alerta' && <strong>Chamar atendente. </strong>}
          {aviso.texto}
        </div>
      )}

      {!rota && <p className="vazio">Nenhuma rota atribuída a você agora. A tela atualiza sozinha.</p>}

      {rota && (
        <ol className="paradas">
          {rota.paradas.map((p) => {
            const atual = p.pedidoId === paradaAtualId;
            return (
              <li key={p.pedidoId} className={`parada ${atual ? 'atual' : ''} parada-${p.status}`}>
                <div className="parada-topo">
                  <span className="numero">{p.ordem}</span>
                  <div>
                    <strong>
                      {p.plataforma} {p.codigoExibicao}
                    </strong>
                    <div className="endereco">{p.endereco}</div>
                  </div>
                  {!atual && <span className="etiqueta">{STATUS[p.status]}</span>}
                </div>
                {atual && (
                  <>
                    <div className="navegar">
                      <a className="botao-grande" href={linkGoogleMaps(p)} target="_blank" rel="noreferrer">
                        Navegar (Google Maps)
                      </a>
                      <a className="botao-grande" href={linkWaze(p)} target="_blank" rel="noreferrer">
                        Waze
                      </a>
                    </div>
                    <ConfirmarEntrega key={p.pedidoId} parada={p} aoResolver={aoResolver} />
                  </>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
