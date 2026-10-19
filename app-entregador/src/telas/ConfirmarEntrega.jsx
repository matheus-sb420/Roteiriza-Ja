import { useState } from 'react';
import { api } from '../api';

// RF25 a RF27: confirmação na parada atual.
// Exige código → um único campo com teclado numérico (RNF04).
// Não exige → só o botão "Entregue" (RN23).
export default function ConfirmarEntrega({ parada, aoResolver }) {
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState(null);

  async function confirmar(evento) {
    evento.preventDefault();
    setEnviando(true);
    try {
      const r = await api(`/app/paradas/${parada.pedidoId}/confirmar`, {
        metodo: 'POST',
        corpo: parada.exigeCodigo ? { codigo } : {},
      });
      if (r.resultado === 'codigo_invalido') {
        setMensagem({ tipo: 'erro', texto: `Código inválido. Restam ${r.tentativasRestantes} tentativa(s).` });
        setCodigo('');
      } else {
        aoResolver(r);
      }
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: e.message });
    }
    setEnviando(false);
  }

  return (
    <form className="confirmar" onSubmit={confirmar}>
      {parada.exigeCodigo && (
        <label>
          Código do cliente
          <input
            className="campo-codigo"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
            placeholder="0000"
          />
        </label>
      )}
      {mensagem && <p className={`mensagem ${mensagem.tipo}`}>{mensagem.texto}</p>}
      <button className="botao-grande primario" disabled={enviando || (parada.exigeCodigo && !codigo)}>
        {enviando ? 'Validando…' : parada.exigeCodigo ? 'Confirmar código' : 'Entregue'}
      </button>
    </form>
  );
}
