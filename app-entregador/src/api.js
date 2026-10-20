// Chamadas à API com o token do entregador.
// Sem VITE_API_URL, usa o mesmo computador que serviu a página (porta 3000).
// Assim o celular na mesma rede Wi-Fi acha a API sem configurar nada.
const API_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3000`;
const CHAVE_TOKEN = 'roteiriza.entregador.token';

export const tokenSalvo = () => localStorage.getItem(CHAVE_TOKEN);
export const salvarToken = (token) => localStorage.setItem(CHAVE_TOKEN, token);
export const apagarToken = () => localStorage.removeItem(CHAVE_TOKEN);

export class ErroApi extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

export async function api(caminho, { metodo = 'GET', corpo } = {}) {
  const resposta = await fetch(`${API_URL}${caminho}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(tokenSalvo() ? { Authorization: `Bearer ${tokenSalvo()}` } : {}),
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new ErroApi(resposta.status, dados.erro || 'Erro na API');
  return dados;
}
