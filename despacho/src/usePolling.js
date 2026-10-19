import { useCallback, useEffect, useRef, useState } from 'react';

// Busca dados agora e repete a cada "intervaloMs" (atualização por consultas
// periódicas, seção 3 do plano técnico). Devolve também "recarregar" para
// atualizar logo depois de uma ação da atendente.
export function usePolling(buscar, intervaloMs) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const buscarRef = useRef(buscar);
  buscarRef.current = buscar;

  const recarregar = useCallback(async () => {
    try {
      setDados(await buscarRef.current());
      setErro(null);
    } catch (e) {
      setErro(e);
    }
  }, []);

  useEffect(() => {
    recarregar();
    const id = setInterval(recarregar, intervaloMs);
    return () => clearInterval(id);
  }, [recarregar, intervaloMs]);

  return { dados, erro, recarregar };
}
