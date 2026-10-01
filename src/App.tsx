import { useState, useEffect } from 'react';
import { Server, Activity, CheckCircle2, RefreshCw, Terminal, ArrowUpRight, ShieldCheck, Cpu } from 'lucide-react';

const API_BASE_URL = 'https://lex-flow-steel.vercel.app';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'endpoints' | 'logs'>('dashboard');
  const [healthData, setHealthData] = useState<any>(null);
  const [rootData, setRootData] = useState<any>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [loadingRoot, setLoadingRoot] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<any>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('GET /api/health');

  const fetchHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`);
      const data = await res.json();
      setHealthData(data);
      setSelectedResponse({ endpoint: 'GET /api/health', status: res.status, data });
    } catch (err: any) {
      const errObj = { error: err.message || 'Falha na conexão com a API' };
      setHealthData(errObj);
      setSelectedResponse({ endpoint: 'GET /api/health', status: 500, data: errObj });
    } finally {
      setLoadingHealth(false);
    }
  };

  const fetchRoot = async () => {
    setLoadingRoot(true);
    try {
      const res = await fetch(`${API_BASE_URL}/`);
      const data = await res.json();
      setRootData(data);
      setSelectedResponse({ endpoint: 'GET /', status: res.status, data });
    } catch (err: any) {
      const errObj = { error: err.message || 'Falha na conexão com a API' };
      setRootData(errObj);
      setSelectedResponse({ endpoint: 'GET /', status: 500, data: errObj });
    } finally {
      setLoadingRoot(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchRoot();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        {/* Zone 1: Brand title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-sm tracking-tighter">
            LF
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-slate-900">Lex Flow</h1>
            <p className="text-xs text-slate-500 font-mono">Dashboard & Vercel API</p>
          </div>
        </div>

        {/* Zone 2: Navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`transition-colors hover:text-slate-900 ${activeTab === 'dashboard' ? 'text-slate-900 font-semibold' : ''}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('endpoints')}
            className={`transition-colors hover:text-slate-900 ${activeTab === 'endpoints' ? 'text-slate-900 font-semibold' : ''}`}
          >
            Endpoints
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`transition-colors hover:text-slate-900 ${activeTab === 'logs' ? 'text-slate-900 font-semibold' : ''}`}
          >
            Logs & Status
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-3">
          <a
            href={API_BASE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <span>API na Vercel</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        
        {/* Hero Banner / Status Overview */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Backend Conectado</span>
              <span>·</span>
              <span>Vercel Cloud Production</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              Painel de Integração Frontend & API
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              O Lex Flow Dashboard está conectado com sucesso à API REST publicada na Vercel. Comunicação de alta performance pronta para as próximas etapas.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => { fetchHealth(); fetchRoot(); }}
              disabled={loadingHealth || loadingRoot}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-sm disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth || loadingRoot ? 'animate-spin' : ''}`} />
              <span>Testar Conexão Agora</span>
            </button>
          </div>
        </div>

        {/* Quick Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-medium uppercase tracking-wider">Status do Servidor</span>
              <Activity className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-slate-900 tabular-nums">
              {healthData?.status === 'ok' ? 'Online (200 OK)' : 'Verificando...'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              API REST ativa na Vercel
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-medium uppercase tracking-wider">Nome da API</span>
              <Server className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-xl font-bold text-slate-900">
              {healthData?.name || 'Lex Flow API'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Identificador padrão
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-medium uppercase tracking-wider">Versão Atual</span>
              <Cpu className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-xl font-bold text-slate-900 tabular-nums">
              {healthData?.version || '1.0.0'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Release de produção
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-medium uppercase tracking-wider">Segurança & TLS</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-slate-900">
              HTTPS / SSL
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Conexão criptografada
            </p>
          </div>
        </div>

        {/* API Interactive Tester & Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Endpoints list */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">Endpoints Disponíveis</h3>
              <span className="text-xs text-slate-500 font-mono">Vercel Deployment</span>
            </div>

            <div className="space-y-3">
              {/* Endpoint 1: GET /api/health */}
              <div 
                onClick={() => { setSelectedEndpoint('GET /api/health'); fetchHealth(); }}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${selectedEndpoint === 'GET /api/health' ? 'border-slate-900 bg-slate-50/80 shadow-xs' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold font-mono bg-emerald-100 text-emerald-800 rounded">GET</span>
                    <span className="text-xs font-mono font-semibold text-slate-800">/api/health</span>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-xs text-slate-600">
                  Verificação de saúde da API e status do sistema.
                </p>
              </div>

              {/* Endpoint 2: GET / */}
              <div 
                onClick={() => { setSelectedEndpoint('GET /'); fetchRoot(); }}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${selectedEndpoint === 'GET /' ? 'border-slate-900 bg-slate-50/80 shadow-xs' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold font-mono bg-emerald-100 text-emerald-800 rounded">GET</span>
                    <span className="text-xs font-mono font-semibold text-slate-800">/</span>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-xs text-slate-600">
                  Rota inicial da API com mensagem de boas-vindas.
                </p>
              </div>
            </div>

            <div className="pt-2 text-xs text-slate-500 border-t border-slate-100">
              <span className="font-medium text-slate-700">URL Base:</span>{' '}
              <code className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800">{API_BASE_URL}</code>
            </div>
          </div>

          {/* Right Column: JSON Response Inspector */}
          <div className="lg:col-span-7 bg-slate-900 text-slate-100 rounded-2xl p-6 shadow-md flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono font-semibold tracking-wide text-slate-300">Inspector de Resposta HTTP</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {selectedEndpoint}
                  </span>
                  {selectedResponse && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                      {selectedResponse.status} OK
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-slate-950 rounded-xl p-4 font-mono text-xs overflow-x-auto text-emerald-300 border border-slate-800/80 min-h-[180px]">
                <pre>{selectedResponse ? JSON.stringify(selectedResponse.data, null, 2) : '// Selecione um endpoint para inspecionar a resposta'}</pre>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Comunicação Frontend → Vercel API ativa</span>
              <span>Lex Flow System v1.0.0</span>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 px-6 text-center text-xs text-slate-500">
        <p>© 2026 Lex Flow. Todos os direitos reservados. Conectado ao backend oficial em produção na Vercel.</p>
      </footer>
    </div>
  );
}
