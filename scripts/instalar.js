// Instala as dependências das quatro pastas e cria os .env que faltam.
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');

for (const pasta of ['api', 'despacho', 'app-entregador', 'simulador']) {
  const dir = path.join(raiz, pasta);
  console.log(`\n== ${pasta}: npm install`);
  execSync('npm install', { cwd: dir, stdio: 'inherit' });

  const exemplo = path.join(dir, '.env.example');
  const env = path.join(dir, '.env');
  if (fs.existsSync(exemplo) && !fs.existsSync(env)) {
    fs.copyFileSync(exemplo, env);
    console.log(`   criado ${pasta}/.env a partir do .env.example`);
  }
}

console.log('\nPronto. Ajuste a senha do PostgreSQL em api/.env, depois rode "npm run preparar-banco".');
