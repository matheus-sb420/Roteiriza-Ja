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
- Orientações para quem (ou o Claude) for programar: [`CLAUDE.md`](CLAUDE.md)

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

Pré-requisitos: Node.js 20+ e PostgreSQL 14+.

Cada pasta é um projeto Node independente. Em terminais separados:

```bash
# API (porta 3000)
cd api
cp .env.example .env     # ajuste a conexão com o banco
npm install
npm run dev

# Sistema de despacho (porta 5173)
cd despacho
npm install
npm run dev

# App do entregador (porta 5174)
cd app-entregador
npm install
npm run dev

# Simulador (porta 4000) — opcional, só para demonstração
cd simulador
npm install
npm start
```

Testes da API e do algoritmo:

```bash
cd api
npm test
```

> As instruções de banco (migrations e seeds) entram na Etapa 2.

## Etapas de desenvolvimento

Cada etapa vai num commit separado, com a explicação do que foi feito e por quê
— o histórico serve de evidência do processo para a banca.

- [ ] **1. Estrutura do projeto** — pastas `api`, `despacho`, `app-entregador` e `simulador`
- [ ] **2. Banco** — models e migrations do Sequelize a partir do modelo de dados
- [ ] **3. API** — porta de entrada, cálculo de setor e folga
- [ ] **4. Algoritmo de sugestão de rotas**, com testes
- [ ] **5. Tela de despacho** com o mapa
- [ ] **6. App do entregador**
- [ ] **7. Simulador**

## Fora do escopo (trabalhos futuros)

Integração real com iFood/99Food/Rappi, conversão de endereço em coordenadas,
GPS do entregador, verificação por SMS, distância e tempo pelas ruas, leitura de
QR code na comanda, previsão do tempo de preparo e relatórios históricos.
