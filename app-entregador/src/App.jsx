import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Tela provisória: só confirma que o app fala com a API.
// Login, "Minha rota" e confirmação de entrega entram na Etapa 6.
export default function App() {
  const [statusApi, setStatusApi] = useState('verificando…');

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((r) => r.json())
      .then((dados) => setStatusApi(dados.status))
      .catch(() => setStatusApi('fora do ar'));
  }, []);

  return (
    <main>
      <h1>Entregador</h1>
      <p>API: {statusApi}</p>
    </main>
  );
}
