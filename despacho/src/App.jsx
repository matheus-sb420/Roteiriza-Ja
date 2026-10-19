import { useEffect, useState } from 'react';
import { apagarToken, quandoSessaoExpirar, tokenSalvo } from './api';
import Login from './paginas/Login';
import Despacho from './paginas/Despacho';
import Entregadores from './paginas/Entregadores';
import Configuracoes from './paginas/Configuracoes';
import Indicadores from './paginas/Indicadores';

const PAGINAS = [
  { id: 'despacho', nome: 'Despacho', Componente: Despacho },
  { id: 'entregadores', nome: 'Entregadores', Componente: Entregadores },
  { id: 'indicadores', nome: 'Indicadores', Componente: Indicadores },
  { id: 'configuracoes', nome: 'Configurações', Componente: Configuracoes },
];

export default function App() {
  const [logado, setLogado] = useState(Boolean(tokenSalvo()));
  const [pagina, setPagina] = useState('despacho');

  const sair = () => {
    apagarToken();
    setLogado(false);
  };

  useEffect(() => quandoSessaoExpirar(sair), []);

  if (!logado) return <Login aoEntrar={() => setLogado(true)} />;

  const { Componente } = PAGINAS.find((p) => p.id === pagina);
  return (
    <div className="app">
      <nav className="navegacao">
        <strong className="marca">Roteiriza Já</strong>
        {PAGINAS.map((p) => (
          <button
            key={p.id}
            className={p.id === pagina ? 'aba ativa' : 'aba'}
            onClick={() => setPagina(p.id)}
          >
            {p.nome}
          </button>
        ))}
        <button className="aba sair" onClick={sair}>
          Sair
        </button>
      </nav>
      <Componente />
    </div>
  );
}
