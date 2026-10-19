// Formatação compartilhada entre as telas.

// RNF02: a urgência não depende só da cor; cada classe tem símbolo e nome.
export const URGENCIA = {
  atrasado: { simbolo: '▲', nome: 'Atrasado', cor: '#d32f2f' },
  critico: { simbolo: '!', nome: 'Crítico', cor: '#ef6c00' },
  normal: { simbolo: '●', nome: 'Normal', cor: '#2e7d32' },
};

export const STATUS = {
  em_preparo: 'Em preparo',
  pronto: 'Pronto',
  em_rota: 'Em rota',
  entregue: 'Entregue',
  pendente_confirmacao: 'Pendente',
  cancelado: 'Cancelado',
};

// "−02 min" / "+15 min": o sinal e o texto mostram a urgência sem depender da cor.
export function formatarFolga(folga) {
  const sinal = folga < 0 ? '−' : '+';
  return `${sinal}${String(Math.abs(folga)).padStart(2, '0')} min`;
}

export function hora(data) {
  if (!data) return '—';
  return new Date(data).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

export const setor = (p) => (p.foraDaArea ? 'Fora da área' : `Anel ${p.anel} · ${p.fatia}`);

// Cores das rotas no mapa e na lateral.
const CORES_ROTAS = ['#1565c0', '#6a1b9a', '#00838f', '#ad1457', '#4e342e', '#283593', '#558b2f', '#f9a825'];
export const corDaRota = (indice) => CORES_ROTAS[indice % CORES_ROTAS.length];

export const ICONE_PLATAFORMA = (plataforma) => {
  const p = plataforma.toLowerCase();
  if (p.includes('ifood')) return 'iF';
  if (p.includes('99')) return '99';
  return plataforma.slice(0, 2).toUpperCase();
};
