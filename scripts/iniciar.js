// Sobe API, despacho, app do entregador e simulador num terminal só.
// Cada linha do log sai com o nome da parte na frente. Ctrl+C encerra tudo.
const { spawn } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');

const raiz = path.join(__dirname, '..');

const PARTES = [
  { nome: 'api', pasta: 'api', comando: 'npm run dev' },
  { nome: 'despacho', pasta: 'despacho', comando: 'npm run dev' },
  { nome: 'entregador', pasta: 'app-entregador', comando: 'npm run dev' },
  { nome: 'simulador', pasta: 'simulador', comando: 'npm start' },
];

const processos = PARTES.map((parte) => {
  const filho = spawn(parte.comando, { cwd: path.join(raiz, parte.pasta), shell: true });
  const prefixo = `[${parte.nome}]`.padEnd(13);
  const escrever = (dados) =>
    String(dados)
      .split(/\r?\n/)
      .filter((linha) => linha.trim())
      .forEach((linha) => console.log(prefixo + linha));
  filho.stdout.on('data', escrever);
  filho.stderr.on('data', escrever);
  filho.on('exit', (codigo) => console.log(`${prefixo}encerrado (código ${codigo})`));
  return filho;
});

// IP do computador na rede local, para abrir o app no celular.
const ip = Object.values(os.networkInterfaces())
  .flat()
  .find((i) => i && i.family === 'IPv4' && !i.internal)?.address;

setTimeout(() => {
  console.log(`
==================================================================
 Despacho:            http://localhost:5173   (admin / admin123)
 App do entregador:   http://localhost:5174${ip ? `   |  no celular: http://${ip}:5174` : ''}
 Simulador:           http://localhost:4000
 Entregadores demo:   19900000001 / PIN 1111  (também ...02/2222 e ...03/3333)
 Ctrl+C encerra tudo.
==================================================================`);
}, 4000);

function encerrar() {
  processos.forEach((p) => p.kill());
  process.exit(0);
}
process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);
