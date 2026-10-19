// Service worker mínimo: permite "adicionar à tela inicial" (RNF08).
// Não guarda nada em cache: a rota precisa vir sempre atualizada da API.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (evento) => evento.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
