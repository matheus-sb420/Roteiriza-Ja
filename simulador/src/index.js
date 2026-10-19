// Simulador de pedidos (Apêndice A dos requisitos).
//
// Ele imita as plataformas de delivery: envia pedidos pela porta de entrada da
// API e recebe, neste servidor, as mensagens da porta de saída ("em rota",
// "entregue" e "validar código"). Por isso nunca importa código da pasta api
// nem acessa o banco. A geração de pedidos entra na Etapa 7.
const http = require('node:http');

const porta = Number(process.env.PORT) || 4000;

const servidor = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }
  res.writeHead(404);
  res.end();
});

servidor.listen(porta, () => {
  console.log(`Simulador rodando em http://localhost:${porta}`);
});
