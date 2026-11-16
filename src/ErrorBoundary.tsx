import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('Erro capturado pelo ErrorBoundary:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6 text-center">
          <div className="bg-rose-500/20 p-4 rounded-2xl mb-4">
            <AlertTriangle className="w-10 h-10 text-rose-400" />
          </div>
          <h1 className="text-xl font-bold mb-2">Ops! Algo deu errado</h1>
          <p className="text-sm text-slate-400 mb-6 max-w-md">
            {this.state.error?.message || 'Ocorreu um erro inesperado. Tente recarregar a página.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl transition"
          >
            Recarregar Página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}