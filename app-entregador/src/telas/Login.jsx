import { useState } from 'react';
import { api, salvarToken } from '../api';

// RF22: login com telefone e PIN.
export default function Login({ aoEntrar }) {
  const [telefone, setTelefone] = useState('');
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState('');

  async function entrar(evento) {
    evento.preventDefault();
    try {
      const { token } = await api('/app/login', { metodo: 'POST', corpo: { telefone, pin } });
      salvarToken(token);
      aoEntrar();
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <main className="tela">
      <h1>Entregador</h1>
      <form onSubmit={entrar} className="formulario">
        <label>
          Telefone
          <input type="tel" inputMode="tel" autoComplete="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        </label>
        <label>
          PIN
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          />
        </label>
        {erro && <p className="mensagem erro">{erro}</p>}
        <button className="botao-grande primario">Entrar</button>
      </form>
    </main>
  );
}
