# Roteiriza Já

Sistema de roteirização de entregas para uma pizzaria em Campinas (SP). Ele
mostra no mapa todos os pedidos com a urgência de cada um, sugere rotas
priorizando os pedidos atrasados ou perto de atrasar e entrega a rota ao
entregador por um app no celular, que confirma cada entrega com o código do
cliente.

Projeto de TCC — prova de conceito. Na demonstração, os pedidos vêm de um
simulador e de cadastro manual; a integração real com iFood, 99Food e outras
plataformas fica para o futuro e não exige mudar o núcleo do sistema.

- Requisitos completos: [`docs/requisitos.md`](docs/requisitos.md)
- Endpoints da API: [`docs/api.md`](docs/api.md)
- Guia de desenvolvimento (arquitetura e convenções): [`CLAUDE.md`](CLAUDE.md)

## O problema

Numa sexta-feira saem cerca de 140 pedidos com 6 a 7 entregadores. A atendente
monta de 35 a 47 rotas à mão, perguntando à cozinha se cada pedido está pronto
e refazendo a rota quando algum não está. O sistema atual não destaca atrasos,
não sugere rotas e não sabe o que está pronto.

## Como o sistema resolve

1. Cada pedido aparece no mapa com a cor da urgência: **atrasado** (vermelho),
   **crítico** (laranja) ou **normal** (verde), calculada pela *folga*:

   ```
   folga = horário prometido − (agora + tempo médio do anel)
   ```

2. O mapa é dividido em **anéis** de 2 km em volta da pizzaria e em **8 fatias**
   (N, NE, L, SE, S, SO, O, NO), como uma pizza. Cada pedido recebe um setor.
3. A atendente marca "Pronto" quando a cozinha avisa.
4. Ao clicar em **Sugerir rotas**, o algoritmo pega o pedido pronto mais urgente
   como âncora e completa a rota (até N pedidos) com pedidos da mesma fatia ou de
   fatias vizinhas, em anéis vizinhos. A urgência decide quem entra; a distância
   decide a ordem das paradas.
5. A atendente aceita, edita ou monta a rota manualmente, escolhe o entregador e
   despacha.
6. No app, o entregador segue as paradas, abre o Google Maps/Waze e confirma
   cada entrega com o código do cliente, validado pela plataforma de origem.

## Stack

| Camada | Tecnologia |
|---|---|
| Banco de dados | PostgreSQL |
| Acesso ao banco | Sequelize (models + migrations) |
| Back-end (API) | Node.js + Express |
| Sistema de despacho | React (web), Vite |
| Mapa | Leaflet + OpenStreetMap |
| App do entregador | React (web para celular, instalável — PWA) |
| Testes do algoritmo | Jest |

Tudo em JavaScript. Spring e React Native ficaram de fora para manter uma
linguagem só e evitar builds de loja de aplicativos. As telas atualizam por
consultas periódicas à API (a cada poucos segundos), o que atende o RNF06;
WebSocket fica como melhoria futura.

## Arquitetura

Toda fonte de pedidos (cadastro manual, simulador, conectores futuros) fala com
o sistema por duas portas fixas. O núcleo não sabe quem está do outro lado
(padrão Adaptador).

```
 Cadastro manual ─┐
 Simulador ───────┼─► Porta de entrada ──► Núcleo ──► Porta de saída ──► fonte do pedido
 Conectores* ─────┘   (valida contrato)    │ setor e folga        (em rota, entregue,
                                           │ sugestão de rotas     validar código)
                                           │ rotas e despacho
                                           ▼
                                     PostgreSQL       Telas: despacho e app do entregador
 * futuro
```

## Estrutura do repositório

```
roteiriza-ja/
├── api/              # Back-end Node + Express + Sequelize (núcleo, portas, HTTP)
├── despacho/         # Tela do caixa: mapa, pedidos, rotas (React + Leaflet)
├── app-entregador/   # Site para celular do entregador (React, PWA)
├── simulador/        # Fonte de pedidos de demonstração (removível)
└── docs/             # Requisitos e documentação do TCC
```

O `simulador` é uma pasta independente: usa só as portas públicas da API e pode
ser apagado sem afetar o resto.

## Como rodar

Pré-requisitos: Node.js 20.12+ e PostgreSQL 14+.

### Jeito rápido (um terminal só)

Na primeira vez, crie os bancos no PostgreSQL:

```sql
CREATE DATABASE roteiriza_ja;
CREATE DATABASE roteiriza_ja_test;   -- usado só pelos testes de banco
```

Depois, na pasta raiz do projeto:

```bash
npm run instalar         # instala as 4 partes e cria os .env
# ajuste DB_USER / DB_PASSWORD em api/.env, se o seu PostgreSQL for diferente
npm run preparar-banco   # cria as tabelas e os dados iniciais (apaga os anteriores)
npm run iniciar          # sobe API, despacho, app e simulador juntos
```

| Parte | Endereço | Acesso |
|---|---|---|
| Despacho | http://localhost:5173 | `admin` / `admin123` |
| App do entregador | http://localhost:5174 | `19900000001` / PIN `1111` (também `…02`/`2222` e `…03`/`3333`) |
| Simulador | http://localhost:4000 | — |

O `npm run iniciar` mostra também o endereço para abrir o app **no celular**
(mesma rede Wi-Fi do computador). As telas descobrem sozinhas onde está a API,
então não é preciso editar nenhum `.env` para isso.

### Jeito manual (cada parte no seu terminal)

```bash
cd api && cp .env.example .env && npm install && npm run db:migrate && npm run db:seed && npm run dev
cd despacho && npm install && npm run dev
cd app-entregador && npm install && npm run dev
cd simulador && npm install && npm start
```

Testes:

```bash
cd api
npm test            # núcleo, algoritmo, contrato e porta de saída (sem banco)
npm run test:banco  # recria o banco de teste e testa a API inteira

cd simulador
npm test            # gerador e motor do simulador
```

Outros comandos do banco: `npm run db:migrate:undo` (desfaz a última
migration) e `npm run db:reset` (apaga tudo, recria e roda os seeds).

## Roteiro de demonstração

1. `npm run preparar-banco` (começa limpo) e `npm run iniciar`.
2. Entre no despacho (`admin` / `admin123`). Já existem três entregadores de
   demonstração; outros podem ser cadastrados em **Entregadores**.
3. Em **Configurações**, deixe o **modo demonstração** ligado.
4. Abra o simulador em http://localhost:4000 e clique em **Iniciar** (pedidos
   chegam no ritmo configurado) ou em **Gerar lote** (vários de uma vez).
5. No despacho, marque pedidos como **Pronto** (ou ligue "marcar pronto
   sozinho" no simulador), informe N e clique em **Sugerir rotas**.
6. **Aceitar** → escolher entregador → **Despachar**.
7. No celular (endereço mostrado pelo `npm run iniciar`) ou numa janela
   estreita, abra o app, entre com `19900000001` / `1111` e confirme as entregas digitando o **código do
   cliente** que aparece na tela do simulador.
8. Para testar a regra das 3 tentativas, digite códigos errados ou marque
   **Plataforma fora do ar** no simulador.

Dicas para a apresentação:

- Rode `npm run preparar-banco` antes, para começar sem pedidos antigos.
- O mapa precisa de internet (as ruas vêm do OpenStreetMap).
- Se o Windows perguntar sobre o firewall do Node, permita em "redes
  privadas", senão o celular não alcança o computador.
- No celular, use o app pelo navegador. Para "instalar na tela inicial" o
  navegador exige HTTPS, o que fica para uma publicação futura.

## Modelo de dados

| Tabela | O que guarda |
|---|---|
| `configuracoes` | Uma linha: endereço e coordenadas da pizzaria, raio máximo, tempo por anel, limite de crítico, prazo LGPD, modo demonstração |
| `administradores` | Login do sistema de despacho (senha com hash) |
| `entregadores` | Nome, telefone (login do app), hash do PIN e situação |
| `pedidos` | Dados do contrato do pedido, setor (anel e fatia), status e horários de pronto/entrega |
| `rotas` | Origem (sugerida/manual), status, entregador e horários de saída/conclusão |
| `paradas` | Liga rota e pedido, com a ordem de entrega e as tentativas de código |

A folga não é gravada: depende do horário atual e é calculada na hora. O
código que o cliente informa na entrega não tem coluna, porque nunca é guardado.

## Etapas de desenvolvimento

Cada etapa vai num commit separado, com a explicação do que foi feito e por quê
— o histórico serve de evidência do processo para a banca.

- [x] **1. Estrutura do projeto** — pastas `api`, `despacho`, `app-entregador` e `simulador`
- [x] **2. Banco** — models e migrations do Sequelize a partir do modelo de dados
- [x] **3. API** — porta de entrada, cálculo de setor e folga
- [x] **4. Algoritmo de sugestão de rotas**, com testes
- [x] **5. Tela de despacho** com o mapa
- [x] **6. App do entregador**
- [x] **7. Simulador**

## Autoria

| Quem | Papel |
|---|---|
| **Matheus Silva Berozzi** | Criador da ideia e membro do desenvolvimento: levantou o problema na pizzaria, escreveu o documento de requisitos e o plano técnico, tomou as decisões de escopo e acompanhou e validou cada etapa |
| **Claude Code** (Anthropic) | Guia e orquestrador do desenvolvimento: transformou os requisitos e o plano em código, testes e documentação, etapa por etapa |

Por isso os commits aparecem com o Claude como autor e Matheus Silva Berozzi
como coautor. O arquivo [`CLAUDE.md`](CLAUDE.md) reúne as regras de
arquitetura e convenções seguidas durante o desenvolvimento.

## Fora do escopo (trabalhos futuros)

Integração real com iFood/99Food/Rappi, conversão de endereço em coordenadas,
GPS do entregador, verificação por SMS, distância e tempo pelas ruas, leitura de
QR code na comanda, previsão do tempo de preparo e relatórios históricos.
