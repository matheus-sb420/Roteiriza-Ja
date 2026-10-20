import { useState } from 'react';

// Horário "HH:MM" daqui a "minutos", no fuso do computador da atendente.
// Leitura e escrita usam o mesmo fuso, para o horário não "pular" de hora.
const doisDigitos = (n) => String(n).padStart(2, '0');
const agoraMais = (minutos) => {
  const d = new Date(Date.now() + minutos * 60000);
  return `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;
};

// "20:55" → data ISO. Se o horário já passou, entende que é do dia seguinte
// (ex.: às 23:50, prometido para 00:30).
function horarioParaData(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const data = new Date();
  data.setHours(h, m, 0, 0);
  if (data < new Date()) data.setDate(data.getDate() + 1);
  return data.toISOString();
}

// RF03: cadastro manual. O local vem do clique no mapa (RN03).
export default function CadastroPedido({ local, aoSalvar, aoCancelar }) {
  const [form, setForm] = useState({
    plataforma: 'iFood',
    codigoExibicao: '',
    clienteNome: '',
    clienteTelefone: '',
    endereco: '',
    prometido: agoraMais(45),
    tipoEntrega: 'propria',
    exigeCodigo: false,
    localizador: '',
  });
  const [erros, setErros] = useState([]);
  const muda = (campo) => (e) =>
    setForm({ ...form, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function salvar(evento) {
    evento.preventDefault();
    try {
      await aoSalvar({
        plataforma: form.plataforma,
        codigoExibicao: form.codigoExibicao,
        clienteNome: form.clienteNome,
        clienteTelefone: form.clienteTelefone || null,
        endereco: form.endereco,
        latitude: local.lat,
        longitude: local.lng,
        horarioPedido: new Date().toISOString(),
        horarioPrometido: horarioParaData(form.prometido),
        tipoEntrega: form.tipoEntrega,
        exigeCodigo: form.exigeCodigo,
        localizador: form.localizador || null,
      });
    } catch (e) {
      setErros(e.detalhes || [e.message]);
    }
  }

  return (
    <div className="fundo-modal">
      <form className="modal" onSubmit={salvar}>
        <h2>Novo pedido manual</h2>
        <p className="dica">
          Local marcado no mapa: {local.lat.toFixed(5)}, {local.lng.toFixed(5)}
        </p>
        <div className="grade-form">
          <label>
            Plataforma
            <select value={form.plataforma} onChange={muda('plataforma')}>
              <option>iFood</option>
              <option>99Food</option>
              <option>Outra</option>
            </select>
          </label>
          <label>
            Código de exibição
            <input value={form.codigoExibicao} onChange={muda('codigoExibicao')} required />
          </label>
          <label>
            Nome do cliente
            <input value={form.clienteNome} onChange={muda('clienteNome')} required />
          </label>
          <label>
            Telefone
            <input value={form.clienteTelefone} onChange={muda('clienteTelefone')} />
          </label>
          <label className="largo">
            Endereço
            <input value={form.endereco} onChange={muda('endereco')} required />
          </label>
          <label>
            Prometido para
            <input type="time" value={form.prometido} onChange={muda('prometido')} required />
          </label>
          <label>
            Entrega
            <select value={form.tipoEntrega} onChange={muda('tipoEntrega')}>
              <option value="propria">Própria</option>
              <option value="plataforma">Pela plataforma</option>
            </select>
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={form.exigeCodigo} onChange={muda('exigeCodigo')} />
            Exige código do cliente na entrega
          </label>
          <label>
            Localizador
            <input value={form.localizador} onChange={muda('localizador')} />
          </label>
        </div>
        {erros.length > 0 && (
          <ul className="erro">
            {erros.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        <div className="botoes">
          <button className="primario">Salvar pedido</button>
          <button type="button" onClick={aoCancelar}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
