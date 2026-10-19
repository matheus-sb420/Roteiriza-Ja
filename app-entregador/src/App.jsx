import { useState } from 'react';
import { apagarToken, tokenSalvo } from './api';
import Login from './telas/Login';
import MinhaRota from './telas/MinhaRota';

// App do entregador (seção 11.2): login e a rota com a confirmação de cada entrega.
export default function App() {
  const [logado, setLogado] = useState(Boolean(tokenSalvo()));

  const sair = () => {
    apagarToken();
    setLogado(false);
  };

  return logado ? <MinhaRota aoSair={sair} /> : <Login aoEntrar={() => setLogado(true)} />;
}
