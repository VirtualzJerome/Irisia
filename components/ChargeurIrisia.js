// L'iris qui pulse — la signature visuelle des attentes IRISIA
export default function ChargeurIrisia({ texte }) {
  return (
    <div className="chargeur-irisia" role="status" aria-live="polite">
      <svg className="iris-pulse" width="46" height="46" viewBox="0 0 30 30" fill="none" aria-hidden="true">
        <ellipse cx="15" cy="15" rx="13" ry="8.2" stroke="#8F79EA" strokeWidth="1.6" />
        <circle cx="15" cy="15" r="4.6" stroke="#D8B45C" strokeWidth="1.6" />
        <circle cx="15" cy="15" r="1.5" fill="#EFEAF6" />
      </svg>
      <p>{texte}</p>
    </div>
  );
}
