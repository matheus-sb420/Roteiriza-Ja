# Requisitos – Sistema de Roteirização de Entregas

> Transcrição em Markdown do documento de requisitos (versão de 18/10/2026) e do
> plano técnico (19/10/2026). Em caso de dúvida, este arquivo é a referência
> para o código. Mudanças de requisito devem ser feitas aqui também.

## 1. Introdução

O sistema sugere e organiza rotas de entrega priorizando pedidos atrasados ou
perto de atrasar. Recebe pedidos de qualquer plataforma de delivery por
conectores independentes e inclui um app para o entregador seguir a rota e
confirmar as entregas.

### 1.1 Contexto

- Pizzaria em Campinas (SP), no bairro Chácara da Barra.
- Numa noite de pico (ex.: sexta-feira) saem cerca de 140 pedidos, com 6 a 7 entregadores.
- As entregas são feitas pelos entregadores fixos da casa. A exceção são alguns
  pedidos do 99Food que já chegam com entrega sob demanda da plataforma.
- Os pedidos de todas as plataformas (iFood, 99Food e outras) chegam
  centralizados na Saipos.
- Ao aceitar um pedido, são impressas duas comandas: uma para o entregador e
  outra, só com os itens, para a cozinha.

### 1.2 Problema

A atendente monta as rotas manualmente no mapa, pedido por pedido. Para saber
se uma rota pode sair, pergunta à cozinha se cada pedido está pronto. Quando um
pedido não está, ela edita ou desfaz a rota e recomeça. O sistema atual não
destaca pedidos atrasados, não sugere rotas e não sabe quais pedidos estão prontos.

### 1.3 Justificativa

- Cerca de 20 pedidos por entregador por noite; com rotas de 3 a 4 pedidos, são
  35 a 47 rotas montadas à mão numa sexta.
- Muitas rotas são montadas mais de uma vez por causa de pedidos não prontos.
- Atrasos geram avaliações ruins nas plataformas e perda de clientes.

### 1.4 Objetivos

**Geral:** reduzir o tempo e o retrabalho na montagem de rotas e diminuir os
pedidos entregues com atraso.

**Específicos:**

1. Mostrar no mapa todos os pedidos, com a urgência de cada um.
2. Registrar quando um pedido fica pronto, sem depender de perguntas à cozinha.
3. Sugerir rotas automaticamente, priorizando os mais urgentes e agrupando por região.
4. Permitir montar e editar rotas manualmente e entregá-las ao entregador por
   um app, com confirmação da entrega pelo código do cliente.
5. Permitir trocar a fonte dos pedidos (simulador hoje, conectores no futuro)
   sem alterar o restante do sistema.

## 2. Escopo

Prova de conceito do despacho de entregas. Na demonstração, os pedidos vêm de
um simulador e de cadastro manual.

### 2.1 Dentro do escopo (MVP)

1. Recebimento de pedidos pelo simulador e por cadastro manual.
2. Mapa com anéis, fatias e pinos com o código do pedido e a cor de urgência.
3. Botão para a atendente marcar o pedido como pronto.
4. Sugestão automática de rotas com limite de pedidos por rota.
5. Montagem e edição manual de rotas.
6. Despacho de rotas e app do entregador: rota, navegação e confirmação por código.
7. Configurações: endereço da pizzaria, raio máximo, tempo médio por anel e limite de "crítico".
8. Painel com indicadores da noite.

### 2.2 Fora do escopo (trabalhos futuros)

Integração real com iFood/99Food/Rappi; conversão automática de endereço em
coordenadas; rastreamento por GPS; verificação do telefone por SMS; distância e
tempo pelas ruas; leitor de código de barras/QR na comanda; previsão do tempo de
preparo; relatórios históricos.

## 3. Usuários e fluxo

| Usuário | O que faz no sistema |
|---|---|
| Administrador / despachante | Acompanha o mapa, marca pedidos como prontos, gera e ajusta rotas, despacha, cadastra entregadores e resolve entregas pendentes |
| Entregador | Usa o app no celular: vê a rota, abre a navegação e confirma cada entrega com o código do cliente |
| Cozinha | Não usa o sistema no MVP; avisa a atendente quando o pedido fica pronto |

### Fluxo proposto

1. O pedido entra no sistema e aparece no mapa com a cor da sua urgência.
2. Quando a cozinha avisa, a atendente toca em "Pronto".
3. A atendente informa quantos pedidos quer por rota e pede sugestões.
4. O sistema sugere rotas só com pedidos prontos, priorizando os mais urgentes.
5. A atendente aceita, edita ou descarta cada sugestão, ou monta uma rota manualmente.
6. Ela atribui o entregador e despacha. A rota aparece no app e a plataforma é avisada.
7. Em cada parada, o entregador digita o código do cliente. Validado, o pedido vira "entregue".
8. Resolvidas todas as paradas, a rota é concluída e o entregador volta a ficar disponível.

## 4. Entidades

### 4.1 Pedido

| Campo | Descrição | Exemplo |
|---|---|---|
| ID interno | Identificador único gerado pelo sistema | 10452 |
| Plataforma | Onde o cliente fez o pedido | iFood |
| Código de exibição | Código da plataforma, só para o pino | 4821 |
| Origem | Quem enviou o pedido | SIMULADOR, MANUAL ou IFOOD |
| Cliente | Nome e telefone | Maria, (19) 99999-0000 |
| Endereço | Rua, número, bairro, complemento | Rua X, 100, Taquaral |
| Coordenadas | Latitude e longitude | -22.88, -47.05 |
| Horário do pedido | Quando foi feito | 20:05 |
| Horário prometido | Até quando o cliente espera | 20:55 |
| Tipo de entrega | Própria ou pela plataforma | Própria |
| Localizador | Código da plataforma para validar a entrega | — |
| Exige código de entrega | Se a plataforma pede o código do cliente | Sim |
| Status | Situação atual | Pronto |
| Anel e fatia | Setor calculado pelas coordenadas | Anel 2, fatia NE |

Status: `em preparo`, `pronto`, `em rota`, `entregue`, `pendente de confirmação`,
`cancelado`. O código que o cliente informa **nunca é guardado** (RN22).

### 4.2 Rota

ID, pedidos (lista ordenada de paradas), entregador, origem (sugerida ou
manual), status (`em montagem`, `despachada`, `concluída`), horário de saída.

### 4.3 Entregador

Nome, telefone (login do app), PIN com hash e situação (`disponível`,
`em rota`, `fora de serviço`).

### 4.4 Configuração

Endereço e coordenadas da pizzaria, raio máximo, tempo médio de trajeto por
anel, limite de "crítico", prazo para apagar dados de clientes, modo demonstração.

### 4.5 Setor: anéis e fatias

Anéis de 2 km em volta da pizzaria e 8 fatias, como uma pizza. Ex.:
"anel 2 (2 a 4 km), fatia Nordeste".

### 4.6 Folga

```
folga = horário prometido − (agora + tempo médio do anel)
```

Recalculada a cada minuto: atrasado (vermelho), crítico (laranja), normal (verde).

## 5. Regras de negócio

| ID | Regra |
|---|---|
| RN01 | Cada pedido tem um ID interno único. O código da plataforma serve só para exibição, pois pode se repetir. |
| RN02 | Todo pedido registra sua origem: SIMULADOR, MANUAL ou a plataforma do conector (ex.: IFOOD). |
| RN03 | Um pedido só é aceito pela porta de entrada se tiver coordenadas. No MVP, o cadastro manual obtém as coordenadas por um clique no mapa. |
| RN04 | Pedidos com entrega pela plataforma nunca entram em rotas. Aparecem com pino diferente e numa lista própria. |
| RN05 | A sugestão automática considera apenas pedidos de entrega própria com status "pronto". |
| RN06 | Uma rota manual pode incluir pedidos em preparo. Ao despachar, o sistema avisa quais não estão prontos e a folga dos demais; a atendente decide. |
| RN07 | Folga = horário prometido − (agora + tempo médio do anel). |
| RN08 | Atrasado se a folga for negativa; crítico se entre 0 e o limite configurado (padrão 10 min); normal acima disso. |
| RN09 | Anéis de 2 km de largura, com centro no endereço da pizzaria. Raio máximo configurável até 12 km (até 6 anéis). |
| RN10 | 8 fatias de 45°: N, NE, L, SE, S, SO, O, NO. A fatia N vai de 337,5° a 22,5°, medidos a partir do norte no sentido horário. |
| RN11 | Pedidos além do raio máximo são "fora da área": não entram em sugestões, mas podem ir em rota manual. |
| RN12 | No anel 1 (0 a 2 km), as fatias são ignoradas no agrupamento. |
| RN13 | O limite de pedidos por rota (N) é definido pelo administrador, mínimo 1. Uma rota pode sair com menos de N pedidos. |
| RN14 | As paradas são ordenadas da mais próxima para a mais distante da pizzaria. A atendente pode reordenar. |
| RN15 | Um pedido pertence a no máximo uma rota ainda não concluída. |
| RN16 | Ao despachar, os pedidos passam a "em rota", a rota aparece no app e o status é enviado pela porta de saída. |
| RN17 | Se uma rota não despachada é desfeita, seus pedidos ficam livres, sem mudar de status. |
| RN18 | Um pedido cancelado sai do mapa e de qualquer rota não despachada. Se já estava em rota, a atendente é avisada e a parada aparece como cancelada no app. |
| RN19 | Distâncias são calculadas em linha reta (aproximação assumida no MVP). |
| RN20 | Dados do cliente (nome, telefone, endereço) são usados só para a entrega e apagados após o prazo definido (LGPD). |
| RN21 | A atendente cadastra o entregador com nome e telefone. O sistema gera um PIN de 4 dígitos, que pode ser trocado. Login no app: telefone e PIN. |
| RN22 | Quando o pedido exige código, o app mostra só o campo do código. O sistema envia o código à fonte do pedido, junto com o localizador, e nunca o guarda. |
| RN23 | Pedido que não exige código é confirmado com o botão "Entregue". |
| RN24 | Após 3 códigos inválidos, ou se a fonte não responder, o pedido vira "pendente de confirmação". O app mostra "Chamar atendente" e passa à próxima parada; o painel alerta a atendente. |
| RN25 | A atendente resolve o pendente pela própria plataforma e marca o pedido como "entregue" ou registra o motivo do problema. |
| RN26 | A rota é concluída automaticamente quando todas as paradas estão entregues, pendentes ou canceladas. O entregador volta a "disponível". |
| RN27 | O entregador vê no app apenas a rota atribuída a ele. |

## 6. Algoritmo de sugestão de rotas

Escolhe o pedido mais urgente como âncora de cada rota e a completa com pedidos
próximos dele. **A urgência decide quem entra; a distância decide a ordem das paradas.**

- **Entrada:** pedidos prontos, de entrega própria, dentro da área, fora de
  qualquer rota; e o limite N.
- **Saída:** lista de rotas sugeridas, cada uma com até N pedidos, ordenada
  pela urgência da âncora.

### Passo a passo

1. Calcular setor (anel e fatia) e folga de cada pedido.
2. Ordenar pela folga (menor primeiro). Empate: o pedido feito há mais tempo.
3. O primeiro da lista vira âncora de uma nova rota.
4. Buscar candidatos compatíveis com a âncora, por preferência (se a âncora
   está no anel 1, todo pedido do anel 1 também conta como preferência 1):
   a. mesma fatia e mesmo anel ou anel vizinho;
   b. fatia vizinha e mesmo anel ou anel vizinho.
5. Em cada nível, escolher os de menor folga, até a rota ter N pedidos.
6. Ordenar as paradas pela distância até a pizzaria (menor para maior).
7. Retirar os pedidos usados e voltar ao passo 3 até a lista acabar.

**Definições:** anel vizinho = diferença de no máximo 1; fatia vizinha = a
imediatamente ao lado, circular (N é vizinha de NO e NE); compatibilidade é
sempre com a âncora, não com os outros pedidos da rota.

**Quando roda:** ao clicar em "Sugerir rotas". Sugestões não aceitas são
descartadas na próxima geração; uma aceita vira rota "em montagem".

### Exemplo (N = 3)

| Pedido | Setor | Folga |
|---|---|---|
| A | Anel 3, NE | −2 min (atrasado) |
| B | Anel 3, NE | 15 min |
| C | Anel 2, L | 8 min |
| D | Anel 1, SO | 5 min |
| E | Anel 1, N | 20 min |

- **Rota 1:** âncora A. B entra no nível 1; C no nível 2. Paradas: C, depois A e B (distância).
- **Rota 2:** âncora D. E é compatível (ambos no anel 1). Paradas por distância.

## 7. Requisitos funcionais

RF01–RF21: sistema de despacho. RF22–RF27: app do entregador.

| ID | O sistema deve… | Prioridade | Regras |
|---|---|---|---|
| RF01 | Permitir login do administrador com usuário e senha | Essencial | — |
| RF02 | Receber pedidos pela porta de entrada, validando os campos obrigatórios | Essencial | RN01–RN03 |
| RF03 | Permitir cadastrar um pedido manualmente, marcando o local com um clique no mapa | Essencial | RN03 |
| RF04 | Exibir o mapa com anéis, fatias e um pino por pedido, com ícone da plataforma, código e cor de urgência | Essencial | RN08–RN10 |
| RF05 | Exibir lista de pedidos ordenada pela folga, ao lado do mapa | Essencial | RN07 |
| RF06 | Recalcular folga e classificação a cada minuto, sem recarregar a página | Essencial | RN07, RN08 |
| RF07 | Permitir marcar e desmarcar um pedido como pronto | Essencial | — |
| RF08 | Exibir separadamente os pedidos com entrega pela plataforma | Essencial | RN04 |
| RF09 | Gerar sugestões de rotas a partir do limite N | Essencial | RN05, RN11–RN14 |
| RF10 | Permitir aceitar, editar ou descartar cada sugestão | Essencial | — |
| RF11 | Permitir montar rota manualmente, selecionando pedidos no mapa ou na lista | Essencial | RN06, RN11 |
| RF12 | Permitir adicionar, remover e reordenar pedidos antes do despacho | Essencial | RN14, RN15 |
| RF13 | Permitir atribuir entregador disponível e despachar, enviando ao app | Essencial | RN06, RN16 |
| RF14 | Concluir a rota automaticamente e permitir conclusão manual | Essencial | RN26 |
| RF15 | Cadastrar entregadores com nome e telefone, gerar/trocar PIN e alterar situação | Essencial | RN21 |
| RF16 | Editar configurações: endereço, raio máximo, tempo por anel, limite de crítico, prazo de retenção | Essencial | RN08, RN09, RN20 |
| RF17 | Enviar mudanças de status e pedidos de validação de código pela porta de saída | Essencial | RN16, RN22 |
| RF18 | Ligar e desligar o modo demonstração | Essencial | — |
| RF19 | Indicadores da noite: total de pedidos, atrasados, rotas despachadas, entregas pendentes, tempo médio entre "pronto" e despacho | Essencial | — |
| RF20 | Tratar cancelamentos recebidos pela porta de entrada | Desejável | RN18 |
| RF21 | Destacar entregas pendentes de confirmação e permitir resolvê-las | Essencial | RN24, RN25 |
| RF22 | Login do entregador no app com telefone e PIN | Essencial | RN21, RN27 |
| RF23 | Exibir a rota com paradas na ordem, endereço e código, destacando a parada atual | Essencial | RN14, RN27 |
| RF24 | Abrir Google Maps ou Waze com a localização da parada atual | Essencial | — |
| RF25 | Confirmar a entrega com o código do cliente, validado pela fonte | Essencial | RN22 |
| RF26 | Confirmar com o botão "Entregue" pedidos que não exigem código | Essencial | RN23 |
| RF27 | Após 3 códigos inválidos ou sem resposta, marcar pendente e mostrar "Chamar atendente" | Essencial | RN24 |

## 8. Requisitos não funcionais

| ID | Categoria | Requisito |
|---|---|---|
| RNF01 | Usabilidade | Aceitar sugestão, atribuir entregador e despachar em no máximo 4 cliques |
| RNF02 | Usabilidade | Urgência não depende só da cor: pino e lista mostram símbolo ou texto (ex.: "−02 min"), com legenda |
| RNF03 | Usabilidade | Marcar como pronto em um clique, pela lista ou pelo pino |
| RNF04 | Usabilidade | No app, o campo do código abre teclado numérico; botões grandes, uso com uma mão |
| RNF05 | Desempenho | Sugestões para até 50 pedidos prontos em até 2 s |
| RNF06 | Desempenho | Pedido novo aparece no mapa em até 10 s |
| RNF07 | Desempenho | Resposta da validação do código em até 10 s; acima disso, fonte sem resposta (RN24) |
| RNF08 | Portabilidade | Despacho no navegador do caixa; app no navegador do celular, instalável na tela inicial |
| RNF09 | Segurança | Senhas e PINs com hash, nunca em texto puro |
| RNF10 | Privacidade (LGPD) | Guardar só os dados necessários, apagando-os após o prazo configurado |
| RNF11 | Manutenibilidade | O núcleo não depende de nenhuma fonte de pedidos específica |
| RNF12 | Manutenibilidade | O algoritmo de sugestão tem testes automatizados com cenários conhecidos |
| RNF13 | Custo | Base cartográfica gratuita |

## 9. Arquitetura de integração

Toda fonte de pedidos conversa com o sistema por duas portas fixas, e o núcleo
não sabe quem está do outro lado (padrão Adaptador).

```
 Cadastro manual ─┐
                  ├─► Porta de entrada ──► Núcleo ◄──► Telas (despacho, app)
 Simulador ───────┤   (valida contrato)    │  setor e folga
 Conectores* ─────┘          ▲             │  sugestão de rotas
                             │             │  rotas e despacho
                  Conversor de endereço*   ▼
                                       Banco de dados
          Porta de saída ◄── Núcleo
          (status e validação de código ──► fonte do pedido)

 * peça futura
```

### 9.1 Porta de entrada

Três mensagens: **novo pedido**, **pedido cancelado** e **pedido pronto**.
Toda mensagem é validada contra o contrato antes de chegar ao núcleo.

### 9.2 Contrato do pedido

| Campo | Obrigatório | Observação |
|---|---|---|
| Plataforma | Sim | iFood, 99Food, outra |
| Código de exibição | Sim | Formato livre |
| Origem | Sim | SIMULADOR, MANUAL ou a plataforma |
| Endereço | Sim | Usado pelo entregador |
| Coordenadas | Sim no MVP | No futuro, o conversor preenche |
| Horário do pedido | Sim | — |
| Horário prometido | Sim | Base da folga |
| Tipo de entrega | Sim | Própria ou pela plataforma |
| Exige código de entrega | Sim | Sim ou não |
| Localizador | Não | Enviado de volta na validação do código |
| Nome do cliente | Sim | Apagado após o prazo (RN20) |
| Telefone do cliente | Não | Apagado após o prazo (RN20) |

### 9.3 Porta de saída

Três mensagens para a fonte do pedido: **pedido em rota**, **pedido entregue**
e **validar código** (pergunta e resposta: leva localizador e código; a fonte
responde se é válido).

### 9.4 Regras de encaixe

- O núcleo nunca cita o simulador nem os conectores.
- As fontes usam apenas as portas: nunca gravam direto no banco nem chamam partes internas.
- Cada pedido guarda sua origem (permite filtrar ou apagar dados de teste).
- O modo demonstração liga ou desliga o simulador.
- O conversor de endereço, quando existir, só é chamado se faltarem coordenadas.

## 10. Casos de uso

| ID | Caso de uso | Ator | Requisitos |
|---|---|---|---|
| UC01 | Fazer login | Administrador | RF01 |
| UC02 | Cadastrar pedido manual | Administrador | RF03 |
| UC03 | Marcar pedido como pronto | Administrador | RF07 |
| UC04 | Gerar e aceitar sugestões de rotas | Administrador | RF09, RF10 |
| UC05 | Montar rota manualmente | Administrador | RF11, RF12 |
| UC06 | Despachar rota | Administrador | RF13, RF17 |
| UC07 | Gerenciar entregadores | Administrador | RF15 |
| UC08 | Configurar o sistema | Administrador | RF16, RF18 |
| UC09 | Consultar indicadores da noite | Administrador | RF19 |
| UC10 | Resolver entrega pendente | Administrador | RF21 |
| UC11 | Entrar no app | Entregador | RF22 |
| UC12 | Seguir a rota | Entregador | RF23, RF24 |
| UC13 | Confirmar entrega | Entregador | RF14, RF25–RF27 |

**UC04 – Gerar e aceitar sugestões.** Pré: há pedidos prontos de entrega própria
fora de rotas. Fluxo: informa N → "Sugerir rotas" → algoritmo da seção 6 → cada
rota desenhada no mapa com uma cor → aceita → vira rota em montagem.
Alternativos: 3a nenhum pedido pronto (avisa); 5a edita (UC05) e aceita; 5b
descarta (pedidos ficam livres). Pós: cada pedido aceito está em exatamente uma
rota em montagem.

**UC13 – Confirmar entrega.** Pré: entregador logado com rota despachada.
Fluxo: app mostra parada atual → "Navegar" → digita o código → sistema envia
código e localizador à fonte → fonte diz válido → pedido "entregue" e próxima
parada. Alternativos: 3a não exige código (botão "Entregue"); 5a código
inválido (nova tentativa); 5b três falhas ou fonte sem resposta (pendente,
"Chamar atendente", próxima parada); 6a última parada (rota concluída,
entregador disponível).

## 11. Telas

**Despacho (principal):**
- Centro: mapa com a pizzaria no meio, anéis de 2 km com rótulo de distância e
  linhas das 8 fatias; botão para mostrar/esconder anéis e fatias.
- Pinos: ícone da plataforma, código e cor de urgência. Em preparo aparecem
  esmaecidos; entrega pela plataforma com formato diferente.
- Lateral esquerda: lista ordenada pela folga, filtros por status, aba separada
  para entrega pela plataforma.
- Lateral direita: rotas em montagem e despachadas, cada uma com sua cor,
  paradas e entregador. Pendentes de confirmação no topo, em destaque.
- Topo: campo do limite N, botão "Sugerir rotas", legenda das cores e
  indicadores rápidos (atrasados agora, rotas na rua).

**App do entregador** (site para celular, instalável): Login (telefone e PIN);
Minha rota (paradas na ordem, parada atual com "Navegar"); Confirmar entrega
(campo numérico único, ou só o botão "Entregue").

**Telas de apoio:** Login; Cadastro manual de pedido (local por clique no mapa);
Entregadores; Configurações; Indicadores.

## 12. Validação e métricas

Comparação entre uma noite real (antes) e uma noite simulada no sistema (depois):
tempo para montar uma rota, rotas refeitas, pedidos atrasados e tempo entre
"pronto" e despacho. O simulador reproduz ~140 pedidos com a mesma distribuição
de horários.

### Testes do algoritmo (cenários obrigatórios)

- Nenhum pedido normal vira âncora enquanto houver um atrasado fora de rotas.
- Pedidos em fatias opostas, fora do anel 1, nunca ficam na mesma rota sugerida.
- Nenhuma rota sugerida passa de N pedidos.
- Pedidos com entrega pela plataforma nunca aparecem em sugestões.
- O exemplo da seção 6 gera exatamente as duas rotas descritas.
- Três códigos inválidos deixam o pedido como "pendente de confirmação".
- A rota é concluída sozinha quando a última parada é resolvida.

## 13. Limitações conscientes

Pedidos de simulador e cadastro manual; validação de código depende de cada
plataforma; coordenadas por clique no mapa; distância em linha reta;
compatibilidade só com a âncora; "pronto" marcado pela atendente; tempo de
trajeto fixo por anel; sem localização do entregador; login sem SMS.

## Apêndice A – Simulador de pedidos

Ferramenta de demonstração, separada do sistema. Envia pedidos pela porta de
entrada e recebe status e pedidos de validação pela porta de saída. Para
removê-lo, basta desligar o modo demonstração ou apagar o módulo.

**Gera:** pedidos de várias plataformas com o formato de código de cada uma
(4 dígitos no iFood, 6 no 99Food); coordenadas sorteadas de uma lista de pontos
reais de Campinas dentro do raio; horário prometido = horário do pedido + prazo;
um localizador e um código do cliente por pedido (o código aparece na tela do
simulador); parte dos pedidos do 99Food com entrega pela plataforma;
opcionalmente, cancelamentos.

| Parâmetro | Exemplo |
|---|---|
| Pedidos por hora | 40 |
| Distribuição por plataforma | 60% iFood, 30% 99Food, 10% outras |
| Prazo prometido | 40 a 60 min após o pedido |
| Pedidos com entrega pela plataforma | 5% dos pedidos do 99Food |
| Marcar "pronto" automaticamente | Desligado (ligado: após tempo sorteado de preparo) |

**Regras:** usa apenas as portas públicas; marca tudo com origem SIMULADOR;
marca "pronto" pela mensagem "pedido pronto" da porta de entrada; responde a
"validar código" como uma plataforma faria; pode simular plataforma fora do ar
(para testar RN24).
