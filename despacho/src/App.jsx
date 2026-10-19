import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Tela provisória: só confirma que o despacho fala com a API.
// O mapa, a lista de pedidos e as rotas entram na Etapa 5.
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
      <h1>Roteiriza Já – Despacho</h1>
      <p>API: {statusApi}</p>
    </main>
  );
}
