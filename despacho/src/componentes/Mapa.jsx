import { useMemo } from 'react';
import L from 'leaflet';
import { Circle, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMapEvents } from 'react-leaflet';
import { pontoADistancia } from '../geo';
import { URGENCIA, STATUS, ICONE_PLATAFORMA, formatarFolga, setor, hora } from '../formatar';

const FATIAS = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];

const iconePizzaria = L.divIcon({ className: '', html: '<div class="pino-pizzaria">🍕</div>', iconSize: null });

// Pino do pedido (RF04): ícone da plataforma, código e urgência com símbolo e
// texto (RNF02). Em preparo fica esmaecido; entrega pela plataforma tem outro formato.
function iconeDoPedido(pedido, { selecionado, corRota }) {
  const u = URGENCIA[pedido.classificacao];
  const classes = [
    'pino',
    `pino-${pedido.classificacao}`,
    pedido.status === 'em_preparo' ? 'esmaecido' : '',
    pedido.tipoEntrega === 'plataforma' ? 'pino-plataforma' : '',
    selecionado ? 'selecionado' : '',
  ].join(' ');
  const borda = corRota ? `style="box-shadow: 0 0 0 3px ${corRota}"` : '';
  return L.divIcon({
    className: '',
    iconSize: null,
    html: `<div class="${classes}" ${borda}>
      <span class="pino-plataforma-icone">${ICONE_PLATAFORMA(pedido.plataforma)}</span>
      <b>${pedido.codigoExibicao}</b>
      <span>${u.simbolo} ${formatarFolga(pedido.folga)}</span>
    </div>`,
  });
}

function CapturaClique({ ativo, aoClicar }) {
  useMapEvents({
    click(evento) {
      if (ativo) aoClicar(evento.latlng);
    },
  });
  return null;
}

// Anéis de 2 km com rótulo de distância, círculo do raio máximo e linhas das fatias.
function Setores({ centro, raioMaximoKm }) {
  const aneis = [];
  for (let km = 2; km < raioMaximoKm; km += 2) aneis.push(km);
  return (
    <>
      {aneis.map((km) => (
        <Circle key={km} center={centro} radius={km * 1000} pathOptions={{ color: '#555', weight: 1, fill: false }} />
      ))}
      <Circle
        center={centro}
        radius={raioMaximoKm * 1000}
        pathOptions={{ color: '#c62828', weight: 2, dashArray: '6 6', fill: false }}
      />
      {[...aneis, raioMaximoKm].map((km) => (
        <Marker
          key={`rotulo-${km}`}
          position={pontoADistancia(centro, km, 0)}
          interactive={false}
          icon={L.divIcon({ className: '', iconSize: null, html: `<span class="rotulo-anel">${km} km</span>` })}
        />
      ))}
      {FATIAS.map((fatia, i) => (
        <Polyline
          key={fatia}
          positions={[centro, pontoADistancia(centro, raioMaximoKm, i * 45 + 22.5)]}
          pathOptions={{ color: '#555', weight: 1, dashArray: '2 6' }}
        />
      ))}
      {FATIAS.map((fatia, i) => (
        <Marker
          key={`rotulo-${fatia}`}
          position={pontoADistancia(centro, raioMaximoKm + 0.6, i * 45)}
          interactive={false}
          icon={L.divIcon({ className: '', iconSize: null, html: `<span class="rotulo-fatia">${fatia}</span>` })}
        />
      ))}
    </>
  );
}

export default function Mapa({
  configuracao,
  pedidos,
  linhas,
  coresPorRota,
  mostrarSetores,
  selecionados,
  modoCadastro,
  localCadastro,
  aoClicarMapa,
  aoClicarPino,
}) {
  const centro = useMemo(
    () => [configuracao.latitudePizzaria, configuracao.longitudePizzaria],
    [configuracao.latitudePizzaria, configuracao.longitudePizzaria],
  );

  return (
    <MapContainer center={centro} zoom={13} className={modoCadastro ? 'mapa cursor-mira' : 'mapa'}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CapturaClique ativo={modoCadastro} aoClicar={aoClicarMapa} />
      {mostrarSetores && <Setores centro={centro} raioMaximoKm={configuracao.raioMaximoKm} />}
      <Marker position={centro} icon={iconePizzaria} />

      {linhas.map((linha) => (
        <Polyline
          key={linha.chave}
          positions={[centro, ...linha.pontos]}
          pathOptions={{ color: linha.cor, weight: 4, opacity: 0.8, dashArray: linha.tracejada ? '8 8' : null }}
        />
      ))}

      {pedidos.map((pedido) => (
        <Marker
          key={pedido.id}
          position={[pedido.latitude, pedido.longitude]}
          icon={iconeDoPedido(pedido, {
            selecionado: selecionados.has(pedido.id),
            corRota: pedido.rotaId ? coresPorRota[pedido.rotaId] : null,
          })}
          eventHandlers={{ click: () => aoClicarPino(pedido) }}
        >
          <Tooltip direction="top" offset={[0, -20]}>
            <strong>
              {pedido.plataforma} {pedido.codigoExibicao}
            </strong>{' '}
            · {STATUS[pedido.status]}
            <br />
            {pedido.endereco}
            <br />
            {setor(pedido)} · {pedido.distanciaKm} km
            <br />
            Prometido {hora(pedido.horarioPrometido)} · folga {formatarFolga(pedido.folga)}
          </Tooltip>
        </Marker>
      ))}

      {localCadastro && (
        <Marker
          position={[localCadastro.lat, localCadastro.lng]}
          icon={L.divIcon({ className: '', iconSize: null, html: '<div class="pino-novo">Novo pedido</div>' })}
        />
      )}
    </MapContainer>
  );
}
