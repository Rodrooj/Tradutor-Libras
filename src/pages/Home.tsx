import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Shield,
  WifiOff,
  Camera,
  Cpu,
  MessageSquare,
  Volume2,
  ArrowRight,
  ChevronRight,
  Brain,
  Eye,
  Mic,
} from 'lucide-react';
import { SIGNAL_EMOJIS } from '../lib/libras';

const SIGNALS = [
  'Olá', 'Obrigado', 'Água', 'Ajuda', 'Sim',
  'Não', 'Tudo bem', 'Tchau', 'Desculpa', 'Por favor',
];

const FEATURES = [
  {
    icon: <Zap size={24} />,
    title: 'Tempo Real',
    description: 'Latência inferior a 50ms. O sistema processa 30 FPS com classificação instantânea dos sinais.',
  },
  {
    icon: <Shield size={24} />,
    title: 'Privacidade Total',
    description: 'Processamento 100% local via Edge Computing. Nenhum vídeo ou dado é enviado para servidores.',
  },
  {
    icon: <WifiOff size={24} />,
    title: 'Funciona Offline',
    description: 'Após o carregamento inicial, toda a IA roda no seu dispositivo sem necessidade de internet.',
  },
];

const PIPELINE_STEPS = [
  { icon: '📷', label: 'Câmera', detail: '30 FPS' },
  { icon: '🦴', label: 'MediaPipe', detail: '33 Landmarks' },
  { icon: '📊', label: 'Buffer', detail: '30 Frames' },
  { icon: '🧠', label: 'LSTM', detail: '67K params' },
  { icon: '🔊', label: 'Áudio', detail: 'pt-BR' },
];

const TECH_STACK = [
  { name: 'MediaPipe Pose', desc: '33 landmarks (x, y, z) rastreados em tempo real' },
  { name: 'TensorFlow.js', desc: 'Modelo LSTM com 67.530 parâmetros treináveis' },
  { name: 'Web Speech API', desc: 'Síntese de voz nativa em português brasileiro' },
  { name: 'React + TypeScript', desc: 'Interface responsiva com design moderno' },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div>
      {/* Header */}
      <header className="header" id="header">
        <div className="header-inner">
          <div
            className="header-logo"
            onClick={() => navigate('/')}
            role="button"
            tabIndex={0}
            id="header-logo"
          >
            <span className="header-logo-icon">🤟</span>
            <span>Tradutor Libras</span>
          </div>
          <nav className="header-nav">
            <button
              className="btn btn-primary"
              onClick={() => navigate('/tradutor')}
              id="header-open-translator"
            >
              Abrir Tradutor
              <ArrowRight size={16} />
            </button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="hero" id="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <Brain size={16} />
            <span>Inteligência Artificial • Edge Computing</span>
          </div>

          <h1 className="hero-title">
            Tradução de{' '}
            <span className="hero-title-gradient">Libras para Áudio</span>
            {' '}em Tempo Real
          </h1>

          <p className="hero-description">
            Um sistema de IA que utiliza a câmera do seu dispositivo para
            reconhecer sinais da Língua Brasileira de Sinais e convertê-los
            em áudio automaticamente. Quebrando barreiras de comunicação.
          </p>

          <div className="hero-actions">
            <button
              className="btn btn-primary btn-lg"
              onClick={() => navigate('/tradutor')}
              id="hero-cta"
            >
              Comece Agora
              <ArrowRight size={20} />
            </button>
            <a
              href="#features"
              className="btn btn-secondary btn-lg"
              id="hero-learn-more"
            >
              Saiba Mais
              <ChevronRight size={20} />
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section" id="features">
        <div className="section-inner">
          <h2 className="section-title animate-fade-in-up">Por que usar?</h2>
          <p className="section-subtitle animate-fade-in-up delay-100">
            Tecnologia de ponta para acessibilidade e inclusão
          </p>

          <div className="grid grid-3" style={{ marginTop: '3rem' }}>
            {FEATURES.map((feature, index) => (
              <div
                key={feature.title}
                className={`glass-card feature-card animate-fade-in-up delay-${(index + 2) * 100}`}
                id={`feature-card-${index}`}
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pipeline */}
      <section className="section" id="pipeline-section" style={{ background: 'var(--color-bg-secondary)' }}>
        <div className="section-inner" style={{ textAlign: 'center' }}>
          <h2 className="section-title animate-fade-in-up">
            Arquitetura do Pipeline
          </h2>
          <p className="section-subtitle animate-fade-in-up delay-100" style={{ margin: '0 auto' }}>
            5 etapas de processamento em tempo real, do vídeo ao áudio
          </p>

          <div className="pipeline" style={{ marginTop: '3rem' }}>
            {PIPELINE_STEPS.map((step, index) => (
              <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className={`pipeline-step animate-fade-in-up delay-${(index + 1) * 100}`}>
                  <span className="pipeline-step-icon">{step.icon}</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>{step.label}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{step.detail}</div>
                  </div>
                </div>
                {index < PIPELINE_STEPS.length - 1 && (
                  <span className="pipeline-arrow">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="section" id="tech-section">
        <div className="section-inner">
          <h2 className="section-title animate-fade-in-up">
            Tecnologias Utilizadas
          </h2>
          <p className="section-subtitle animate-fade-in-up delay-100">
            Stack moderna para processamento de IA no navegador
          </p>

          <div className="grid grid-2" style={{ marginTop: '3rem' }}>
            {TECH_STACK.map((tech, index) => (
              <div
                key={tech.name}
                className={`glass-card animate-fade-in-up delay-${(index + 2) * 100}`}
                id={`tech-card-${index}`}
              >
                <h3 className="feature-title">{tech.name}</h3>
                <p className="feature-description">{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Signals */}
      <section className="section" id="signals-section" style={{ background: 'var(--color-bg-secondary)' }}>
        <div className="section-inner" style={{ textAlign: 'center' }}>
          <h2 className="section-title animate-fade-in-up">
            Sinais Reconhecidos
          </h2>
          <p className="section-subtitle animate-fade-in-up delay-100" style={{ margin: '0 auto' }}>
            10 sinais da Língua Brasileira de Sinais treinados via modelo LSTM
          </p>

          <div className="grid grid-5" style={{ marginTop: '3rem' }}>
            {SIGNALS.map((signal, index) => (
              <div
                key={signal}
                className={`glass-card signal-card animate-scale-in delay-${Math.min((index + 1) * 100, 500)}`}
                id={`signal-card-${index}`}
              >
                <span className="signal-emoji">
                  {SIGNAL_EMOJIS[signal] ?? '🤟'}
                </span>
                <span className="signal-name">{signal}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '3rem' }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => navigate('/tradutor')}
              id="signals-cta"
            >
              Experimentar Agora
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer" id="footer">
        <div className="footer-inner">
          <div className="footer-text">
            <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>🤟</span>
            Tradutor de Libras para Áudio — Projeto Acadêmico de IA
          </div>
          <div className="footer-text">
            Desenvolvido com ❤️ para quebrar barreiras de comunicação
          </div>
        </div>
      </footer>
    </div>
  );
}
