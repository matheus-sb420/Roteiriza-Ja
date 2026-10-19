# CLAUDE.md

Orientações para o Claude (e para qualquer pessoa) trabalhar neste repositório.
Leia junto com [`README.md`](README.md) e [`docs/requisitos.md`](docs/requisitos.md),
que é a fonte de verdade das regras de negócio (RN), requisitos (RF/RNF) e do
algoritmo.

## Contexto

TCC: prova de conceito de despacho de entregas para uma pizzaria. O histórico
de commits é evidência do processo para a banca, então:

- **Uma etapa por commit** (ou poucos commits por etapa), com mensagem em
  português explicando *o que* foi feito e *por quê*.
- Não pular etapas do plano; não adiantar trabalho de etapas futuras sem combinar.
- Código simples e explicável é melhor que código esperto. O aluno precisa
  conseguir defender cada parte.

## Etapas

1. Estrutura do projeto ✅
2. Banco: models e migrations do Sequelize ✅
3. API: porta de entrada, cálculo de setor e folga ✅
4. Algoritmo de sugestão de rotas, com testes (Jest)
5. Tela de despacho com o mapa
6. App do entregador
7. Simulador

Ao terminar uma etapa, marcar o checklist no `README.md`.

## Layout

```
api/              Node + Express + Sequelize (CommonJS)
  src/
    nucleo/       Regras de domínio puras (geo, setor, folga, sugestão).
                  Não importa Express, Sequelize, nem nada de fontes.
    servicos/     Casos de uso com banco (pedidos, rotas, entregadores…).
                  Junto com nucleo/ forma o "núcleo" da arquitetura.
    portas/
      entrada/    Valida o contrato do pedido e chama o núcleo
      saida/      Envia status e "validar código" à fonte do pedido
    http/         Rotas Express (controllers finos) e middlewares
    erros.js      ErroNegocio(status, mensagem, detalhes) → resposta JSON
    models/       Models Sequelize
    config/       Variáveis de ambiente e conexão
  migrations/     Migrations Sequelize (uma por tabela, com CHECK nos status)
  seeders/        Configuração inicial e administrador
  tests/          Jest
despacho/         React + Vite + Leaflet (tela do caixa)
app-entregador/   React + Vite, PWA para celular
simulador/        Node; fonte de pedidos de demonstração
docs/             Requisitos
```

Cada pasta é um projeto npm independente (sem workspaces), para que o
`simulador` possa ser apagado sem mexer em nada.

## Regras de arquitetura (não quebrar)

- **O núcleo nunca cita o simulador nem conectores** (RNF11). Nada de
  `if (origem === 'SIMULADOR')` em `nucleo/`.
- **Fontes só falam com as portas**: o simulador nunca importa código da `api`
  nem acessa o banco; usa HTTP.
- A porta de entrada aceita três mensagens: *novo pedido*, *pedido cancelado*,
  *pedido pronto*. A de saída envia: *pedido em rota*, *pedido entregue*,
  *validar código*. Para descobrir para onde enviar, a porta de saída usa a
  `origem` do pedido mapeada para uma URL configurada (ex.: variável de
  ambiente), nunca um caso especial no núcleo.
- Funções do núcleo recebem `agora` e a configuração como parâmetros (sem
  `Date.now()` escondido), para os testes serem determinísticos.

## Regras de domínio que mais geram bug

- **Folga** = horário prometido − (agora + tempo médio do anel), em minutos.
  Atrasado se < 0; crítico se 0 ≤ folga ≤ limite (padrão 10); normal acima.
- **Anéis** de 2 km, anel 1 = 0–2 km. Raio máximo até 12 km (6 anéis). Além do
  raio: "fora da área" — fora das sugestões, mas permitido em rota manual.
- **Fatias** de 45°, rumo medido do norte no sentido horário. N = 337,5°–22,5°.
  Ordem: N, NE, L, SE, S, SO, O, NO (circular). Use rumo geográfico (bearing),
  não `atan2(dy, dx)` cartesiano.
- No **anel 1** as fatias são ignoradas no agrupamento.
- Distâncias em linha reta (haversine).
- **Sugestão** só com pedidos `pronto`, entrega própria, dentro da área e fora
  de rotas. Âncora = menor folga (empate: pedido mais antigo). Compatibilidade
  sempre contra a âncora. Paradas ordenadas pela distância à pizzaria.
- Entrega pela plataforma **nunca** entra em rota.
- Um pedido em no máximo uma rota não concluída.
- O código do cliente **nunca é gravado** — só repassado à fonte.
- 3 códigos inválidos, ou fonte sem resposta em 10 s → `pendente de confirmação`.
- Rota concluída automaticamente quando todas as paradas estão entregues,
  pendentes ou canceladas; entregador volta a `disponível`.
- Senhas e PINs sempre com hash (bcrypt).

O exemplo da seção 6 de `docs/requisitos.md` (pedidos A–E, N = 3) deve virar
um teste e gerar exatamente as duas rotas descritas.

## Banco

- Tabelas: `configuracoes` (1 linha), `administradores`, `entregadores`,
  `pedidos`, `rotas`, `paradas` (liga rota e pedido com `ordem` e
  `tentativas_codigo`).
- Status são `STRING` com `CHECK` no banco e `isIn` no model, usando as
  constantes de `src/nucleo/constantes.js` (não usar ENUM do Postgres: é
  difícil de alterar depois).
- Nunca editar uma migration já commitada: criar uma nova.
- Folga não é gravada (depende de "agora"). Anel e fatia são gravados no pedido.
- Hash de senha/PIN fica fora do `defaultScope`; use `scope('comSenha')` /
  `scope('comPin')` só no login.
- RN15 (um pedido em no máximo uma rota não concluída) é garantida na camada
  de serviço, não por constraint.

## API

Endpoints documentados em `docs/api.md` (atualizar ao criar ou mudar um).
Admin usa JWT (`Authorization: Bearer`); fontes usam `x-chave-fonte`. O
cadastro manual passa pela mesma `portas/entrada` com origem `MANUAL`.

## Convenções

- Idioma: português no domínio (nomes de entidades, campos, mensagens, commits),
  sem acentos em identificadores de código (`horarioPrometido`, `folga`, `anel`).
- Valores de status em código: `em_preparo`, `pronto`, `em_rota`, `entregue`,
  `pendente_confirmacao`, `cancelado`; rota: `em_montagem`, `despachada`,
  `concluida`; entregador: `disponivel`, `em_rota`, `fora_de_servico`.
- Origem do pedido em maiúsculas: `SIMULADOR`, `MANUAL`, `IFOOD`…
- Horários guardados em UTC; exibidos em `America/Sao_Paulo`.
- Atualização das telas por polling (a cada poucos segundos), conforme o plano
  técnico; WebSocket só se sobrar tempo.
- Mapa: Leaflet + tiles do OpenStreetMap (gratuito, RNF13).

## Comandos

```bash
cd api && npm install && npm run dev     # API em http://localhost:3000
cd api && npm test                       # Jest (sem banco)
cd api && npm run test:banco             # recria o banco de teste e roda *.banco.test.js
cd api && npm run db:migrate             # aplica migrations (db:seed, db:reset também)
cd despacho && npm run dev               # http://localhost:5173
cd app-entregador && npm run dev         # http://localhost:5174
cd simulador && npm start                # http://localhost:4000
```

Antes de cada commit: rodar `npm test` na `api` (quando houver testes) e
`npm run build` nos fronts que foram alterados.
