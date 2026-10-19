import { useState } from 'react';
import { api, salvarToken } from '../api';

// RF01: login do administrador com usuário e senha.
export default function Login({ aoEntrar }) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  async function entrar(evento) {
    evento.preventDefault();
    try {
      const { token } = await api('/auth/login', { metodo: 'POST', corpo: { usuario, senha } });
      salvarToken(token);
      aoEntrar();
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <main className="tela-login">
      <form onSubmit={entrar} className="cartao">
        <h1>Roteiriza Já</h1>
        <p>Sistema de despacho</p>
        <label>
          Usuário
          <input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoFocus />
        </label>
        <label>
          Senha
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        </label>
        {erro && <p className="erro">{erro}</p>}
        <button className="primario">Entrar</button>
      </form>
    </main>
  );
}
