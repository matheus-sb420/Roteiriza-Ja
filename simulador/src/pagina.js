// Tela do simulador: controles e a lista de pedidos com o código do cliente,
// que a pessoa fazendo o papel de entregador digita no app (seção 12.2).
module.exports = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Simulador de pedidos</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; background: #f5f5f5; color: #222; }
  header { background: #263238; color: #fff; padding: .75rem 1rem; display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
  main { display: grid; grid-template-columns: 320px 1fr; gap: 1rem; padding: 1rem; }
  section { background: #fff; border-radius: 8px; padding: 1rem; }
  label { display: flex; justify-content: space-between; align-items: center; gap: .5rem; margin: .4rem 0; }
  input[type=number] { width: 5rem; }
  button { font: inherit; padding: .4rem .8rem; border-radius: 6px; border: 1px solid #bbb; background: #fff; cursor: pointer; }
  .primario { background: #2e7d32; color: #fff; border-color: #2e7d32; }
  .perigo { background: #c62828; color: #fff; border-color: #c62828; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: .35rem .5rem; border-bottom: 1px solid #eee; }
  .codigo { font-size: 1.3rem; font-weight: 700; letter-spacing: .15rem; }
  .selo { padding: .1rem .5rem; border-radius: 999px; background: #eee; color: #222; font-size: .85rem; }
  .ok { background: #2e7d32; color: #fff; } .erro { background: #c62828; color: #fff; }
  #registro { font-size: .85rem; color: #555; max-height: 260px; overflow: auto; padding-left: 1rem; }
  @media (max-width: 800px) { main { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<header>
  <strong>Simulador de pedidos</strong>
  <span id="modo" class="selo"></span>
  <span id="situacao" class="selo"></span>
  <button id="alternar" class="primario"></button>
  <span>Gerar agora:</span>
  <input id="quantidade" type="number" min="1" max="50" value="5" />
  <button id="lote">Gerar lote</button>
  <span id="mensagem"></span>
</header>
<main>
  <section>
    <h3>Parâmetros</h3>
    <form id="form">
      <label>Pedidos por hora <input type="number" name="pedidosPorHora" min="0" /></label>
      <label>% iFood <input type="number" name="ifood" min="0" /></label>
      <label>% 99Food <input type="number" name="food99" min="0" /></label>
      <label>% outras <input type="number" name="outras" min="0" /></label>
      <label>Prazo mínimo (min) <input type="number" name="prazoMinimoMin" min="1" /></label>
      <label>Prazo máximo (min) <input type="number" name="prazoMaximoMin" min="1" /></label>
      <label>% 99Food entregue pela plataforma <input type="number" name="entregaPlataformaPct" min="0" max="100" /></label>
      <label>Marcar "pronto" sozinho <input type="checkbox" name="autoPronto" /></label>
      <label>Preparo mínimo (min) <input type="number" name="preparoMinimoMin" min="0" /></label>
      <label>Preparo máximo (min) <input type="number" name="preparoMaximoMin" min="0" /></label>
      <label>% de cancelamentos <input type="number" name="cancelamentoPct" min="0" max="100" /></label>
      <label>Plataforma fora do ar <input type="checkbox" name="foraDoAr" /></label>
      <button class="primario">Salvar parâmetros</button>
    </form>
    <h3>Registro</h3>
    <ul id="registro"></ul>
  </section>
  <section>
    <h3>Pedidos gerados</h3>
    <table>
      <thead><tr><th>#</th><th>Plataforma</th><th>Código</th><th>Código do cliente</th><th>Endereço</th><th>Situação</th><th></th></tr></thead>
      <tbody id="pedidos"></tbody>
    </table>
  </section>
</main>
<script>
  const NOMES = { em_preparo: 'Em preparo', pronto: 'Pronto', em_rota: 'Em rota', entregue: 'Entregue', cancelado: 'Cancelado' };
  const $ = (id) => document.getElementById(id);
  let carregouForm = false;

  async function chamar(caminho, corpo) {
    const r = await fetch(caminho, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo || {}) });
    const dados = await r.json().catch(() => ({}));
    $('mensagem').textContent = r.ok ? '' : (dados.erro || 'Erro');
    atualizar();
  }

  function preencherForm(p) {
    const f = $('form');
    for (const campo of ['pedidosPorHora','prazoMinimoMin','prazoMaximoMin','entregaPlataformaPct','preparoMinimoMin','preparoMaximoMin','cancelamentoPct']) f[campo].value = p[campo];
    for (const k of ['ifood','food99','outras']) f[k].value = p.distribuicao[k];
    f.autoPronto.checked = p.autoPronto; f.foraDoAr.checked = p.foraDoAr;
  }

  async function atualizar() {
    const e = await (await fetch('/estado')).json();
    $('modo').textContent = e.modoDemonstracao === null ? 'API não encontrada' : e.modoDemonstracao ? 'Modo demonstração ligado' : 'Modo demonstração DESLIGADO';
    $('modo').className = 'selo ' + (e.modoDemonstracao ? 'ok' : 'erro');
    $('situacao').textContent = e.rodando ? 'Gerando pedidos' : 'Parado';
    $('alternar').textContent = e.rodando ? 'Parar' : 'Iniciar';
    $('alternar').className = e.rodando ? 'perigo' : 'primario';
    if (!carregouForm) { preencherForm(e.parametros); carregouForm = true; }
    $('pedidos').innerHTML = e.pedidos.map((p) => '<tr>' +
      '<td>' + p.id + '</td><td>' + p.plataforma + (p.tipoEntrega === 'plataforma' ? ' (entrega pela plataforma)' : '') + '</td>' +
      '<td>' + p.codigoExibicao + '</td>' +
      '<td class="codigo">' + (p.exigeCodigo ? p.codigoCliente : '—') + '</td>' +
      '<td>' + p.endereco + '</td><td><span class="selo">' + NOMES[p.status] + '</span></td>' +
      '<td>' + (p.status === 'em_preparo' ? '<button onclick="chamar(\\'/pedidos/' + p.id + '/pronto\\')">Pronto</button>' : '') + '</td></tr>').join('');
    $('registro').innerHTML = e.registro.map((r) => '<li>' + new Date(r.horario).toLocaleTimeString('pt-BR') + ' – ' + r.texto + '</li>').join('');
  }

  $('alternar').onclick = () => chamar($('alternar').textContent === 'Parar' ? '/parar' : '/iniciar');
  $('lote').onclick = () => chamar('/lote', { quantidade: Number($('quantidade').value) });
  $('form').onsubmit = (ev) => {
    ev.preventDefault();
    const f = ev.target;
    const n = (c) => Number(f[c].value);
    chamar('/parametros', {
      pedidosPorHora: n('pedidosPorHora'), prazoMinimoMin: n('prazoMinimoMin'), prazoMaximoMin: n('prazoMaximoMin'),
      entregaPlataformaPct: n('entregaPlataformaPct'), preparoMinimoMin: n('preparoMinimoMin'), preparoMaximoMin: n('preparoMaximoMin'),
      cancelamentoPct: n('cancelamentoPct'), autoPronto: f.autoPronto.checked, foraDoAr: f.foraDoAr.checked,
      distribuicao: { ifood: n('ifood'), food99: n('food99'), outras: n('outras') },
    });
  };
  atualizar();
  setInterval(atualizar, 3000);
</script>
</body>
</html>`;
