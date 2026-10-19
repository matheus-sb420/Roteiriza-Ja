import { useEffect, useState } from 'react';
import { api } from '../api';

// RF16 e RF18: configurações da pizzaria e modo demonstração.
export default function Configuracoes() {
  const [form, setForm] = useState(null);
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    api('/api/configuracao').then(setForm);
  }, []);

  if (!form) return <p className="carregando">Carregando…</p>;

  const totalAneis = Math.ceil(Number(form.raioMaximoKm) / 2);
  const tempos = Array.from({ length: totalAneis }, (_, i) => form.temposPorAnelMin[i] ?? '');

  const muda = (campo, conversor = (v) => v) => (e) =>
    setForm({ ...form, [campo]: e.target.type === 'checkbox' ? e.target.checked : conversor(e.target.value) });

  const mudaTempo = (i) => (e) => {
    const novos = [...tempos];
    novos[i] = Number(e.target.value);
    setForm({ ...form, temposPorAnelMin: novos });
  };

  async function salvar(evento) {
    evento.preventDefault();
    try {
      const salvo = await api('/api/configuracao', {
        metodo: 'PUT',
        corpo: { ...form, temposPorAnelMin: tempos.map(Number) },
      });
      setForm(salvo);
      setMensagem('Configurações salvas.');
    } catch (e) {
      setMensagem(e.detalhes ? e.detalhes.join('; ') : e.message);
    }
  }

  return (
    <main className="pagina">
      <h1>Configurações</h1>
      <form onSubmit={salvar} className="grade-form">
        <label className="largo">
          Endereço da pizzaria
          <input value={form.enderecoPizzaria} onChange={muda('enderecoPizzaria')} />
        </label>
        <label>
          Latitude
          <input type="number" step="any" value={form.latitudePizzaria} onChange={muda('latitudePizzaria', Number)} />
        </label>
        <label>
          Longitude
          <input type="number" step="any" value={form.longitudePizzaria} onChange={muda('longitudePizzaria', Number)} />
        </label>
        <label>
          Raio máximo (km, até 12)
          <input type="number" min="1" max="12" value={form.raioMaximoKm} onChange={muda('raioMaximoKm', Number)} />
        </label>
        <label>
          Limite de “crítico” (min)
          <input type="number" min="0" value={form.limiteCriticoMin} onChange={muda('limiteCriticoMin', Number)} />
        </label>
        <label>
          Apagar dados de clientes após (dias)
          <input type="number" min="1" value={form.prazoRetencaoDias} onChange={muda('prazoRetencaoDias', Number)} />
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={form.modoDemonstracao} onChange={muda('modoDemonstracao')} />
          Modo demonstração (simulador ligado)
        </label>
        <fieldset className="largo">
          <legend>Tempo médio de trajeto por anel (min)</legend>
          <div className="tempos-aneis">
            {tempos.map((t, i) => (
              <label key={i}>
                Anel {i + 1} ({i * 2}–{(i + 1) * 2} km)
                <input type="number" min="1" value={t} onChange={mudaTempo(i)} required />
              </label>
            ))}
          </div>
        </fieldset>
        <div className="largo botoes">
          <button className="primario">Salvar</button>
          {mensagem && <span>{mensagem}</span>}
        </div>
      </form>
    </main>
  );
}
