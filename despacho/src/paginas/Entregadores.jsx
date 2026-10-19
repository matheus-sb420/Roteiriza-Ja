import { useEffect, useState } from 'react';
import { api } from '../api';

const SITUACAO = { disponivel: 'Disponível', em_rota: 'Em rota', fora_de_servico: 'Fora de serviço' };

// RF15: cadastro de entregadores, PIN e situação (RN21).
export default function Entregadores() {
  const [lista, setLista] = useState([]);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [pinMostrado, setPinMostrado] = useState(null);
  const [erro, setErro] = useState('');

  const carregar = async () => setLista(await api('/api/entregadores'));
  useEffect(() => {
    carregar();
  }, []);

  async function executar(acao) {
    try {
      setErro('');
      await acao();
    } catch (e) {
      setErro(e.message);
    }
    await carregar();
  }

  const cadastrar = (evento) => {
    evento.preventDefault();
    executar(async () => {
      const { entregador, pin } = await api('/api/entregadores', { metodo: 'POST', corpo: { nome, telefone } });
      setPinMostrado({ nome: entregador.nome, pin });
      setNome('');
      setTelefone('');
    });
  };

  const trocarPin = (e) =>
    executar(async () => {
      const { pin } = await api(`/api/entregadores/${e.id}/pin`, { metodo: 'POST' });
      setPinMostrado({ nome: e.nome, pin });
    });

  const alternarSituacao = (e) =>
    executar(() =>
      api(`/api/entregadores/${e.id}`, {
        metodo: 'PATCH',
        corpo: { situacao: e.situacao === 'disponivel' ? 'fora_de_servico' : 'disponivel' },
      }),
    );

  return (
    <main className="pagina">
      <h1>Entregadores</h1>
      <form className="linha-form" onSubmit={cadastrar}>
        <input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <input placeholder="Telefone (login do app)" value={telefone} onChange={(e) => setTelefone(e.target.value)} required />
        <button className="primario">Cadastrar</button>
      </form>
      {erro && <p className="erro">{erro}</p>}
      {pinMostrado && (
        <div className="destaque-pin">
          PIN de <b>{pinMostrado.nome}</b>: <span className="pin">{pinMostrado.pin}</span>
          <small>Anote e passe ao entregador: ele não aparece de novo.</small>
          <button onClick={() => setPinMostrado(null)}>OK</button>
        </div>
      )}
      <table className="tabela">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Telefone</th>
            <th>Situação</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lista.map((e) => (
            <tr key={e.id}>
              <td>{e.nome}</td>
              <td>{e.telefone}</td>
              <td>{SITUACAO[e.situacao]}</td>
              <td className="botoes">
                <button onClick={() => trocarPin(e)}>Gerar novo PIN</button>
                {e.situacao !== 'em_rota' && (
                  <button onClick={() => alternarSituacao(e)}>
                    {e.situacao === 'disponivel' ? 'Tirar de serviço' : 'Colocar em serviço'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
