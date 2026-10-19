import { URGENCIA } from '../formatar';

// Legenda sempre visível (RNF02).
export default function Legenda({ limiteCriticoMin }) {
  return (
    <div className="legenda">
      {Object.entries(URGENCIA).map(([chave, u]) => (
        <span key={chave} className={`selo selo-${chave}`}>
          {u.simbolo} {u.nome}
          {chave === 'atrasado' && ' (folga < 0)'}
          {chave === 'critico' && ` (0 a ${limiteCriticoMin} min)`}
          {chave === 'normal' && ` (> ${limiteCriticoMin} min)`}
        </span>
      ))}
      <span className="selo selo-esmaecido">Em preparo</span>
      <span className="selo selo-plataforma">Entrega pela plataforma</span>
    </div>
  );
}
