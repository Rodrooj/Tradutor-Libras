import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div>
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div
            className="header-logo"
            onClick={() => navigate('/')}
            role="button"
            tabIndex={0}
          >
            <span className="header-logo-icon">🤟</span>
            <span>Tradutor Libras</span>
          </div>
        </div>
      </header>

      {/* 404 */}
      <div className="not-found animate-fade-in-up">
        <div className="not-found-code">404</div>
        <p className="not-found-text">
          Página não encontrada. Parece que este sinal ainda não foi reconhecido.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            <Home size={18} />
            Voltar ao Início
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/tradutor')}>
            <ArrowLeft size={18} />
            Abrir Tradutor
          </button>
        </div>
      </div>
    </div>
  );
}
