# API – endpoints

Base: `http://localhost:3000`. Corpo e respostas em JSON. Erros vêm como
`{ "erro": "mensagem", "detalhes": [...] }`.

## Autenticação

| Quem | Como |
|---|---|
| Administrador (despacho) | `POST /auth/login` → `{ token }`; enviar `Authorization: Bearer <token>` |
| Fontes de pedidos | Cabeçalho `x-chave-fonte: <CHAVE_FONTES do .env>` |

## Porta de entrada (fontes de pedidos)

| Método | Caminho | O que faz |
|---|---|---|
| POST | `/entrada/pedidos` | Novo pedido (contrato da seção 9.2). Responde `201 { id, anel, fatia, foraDaArea }` |
| POST | `/entrada/pedidos/:id/cancelado` | Pedido cancelado. Corpo `{ origem }` (precisa ser a mesma do pedido) |
| POST | `/entrada/pedidos/:id/pronto` | Pedido pronto. Corpo `{ origem }` |
| GET | `/entrada/configuracao` | Coordenadas da pizzaria, raio máximo e modo demonstração |

Exemplo de novo pedido:

```json
{
  "plataforma": "iFood",
  "codigoExibicao": "4821",
  "origem": "SIMULADOR",
  "endereco": "Rua X, 100, Taquaral",
  "clienteNome": "Maria",
  "clienteTelefone": "19999990000",
  "latitude": -22.88,
  "longitude": -47.05,
  "horarioPedido": "2026-10-23T23:05:00Z",
  "horarioPrometido": "2026-10-23T23:55:00Z",
  "tipoEntrega": "propria",
  "exigeCodigo": true,
  "localizador": "LOC-123"
}
```

## Sistema de despacho (administrador)

| Método | Caminho | O que faz |
|---|---|---|
| GET | `/api/pedidos` | Pedidos ativos ordenados pela folga, com anel, fatia, folga, classificação e rota |
| POST | `/api/pedidos` | Cadastro manual (mesmo contrato; a origem vira `MANUAL`) |
| POST | `/api/pedidos/:id/pronto` | `{ pronto: true \| false }` marca ou desmarca como pronto |
| POST | `/api/pedidos/:id/cancelar` | Cancela o pedido |
| GET | `/api/configuracao` | Configuração atual |
| PUT | `/api/configuracao` | Altera configuração (só os campos enviados) |
| GET | `/api/entregadores` | Lista entregadores |
| POST | `/api/entregadores` | `{ nome, telefone }` → `{ entregador, pin }` (o PIN só aparece aqui) |
| POST | `/api/entregadores/:id/pin` | Gera um PIN novo → `{ pin }` |
| PATCH | `/api/entregadores/:id` | `{ situacao: "disponivel" \| "fora_de_servico" }` |
