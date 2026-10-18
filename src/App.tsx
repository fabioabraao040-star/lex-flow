import { useState, useEffect, useRef } from 'react';
import { 
  Server, Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw, 
  Terminal, ArrowUpRight, ShieldCheck, Cpu, Volume2, VolumeX, Bell, 
  Lock, LogOut, Check, Info, Clock, Zap, ExternalLink, ShieldAlert
} from 'lucide-react';

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authToken, setAuthToken] = useState<string>(() => localStorage.getItem('lexflow_auth_token') || '');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  // Monitoring State
  const [monitoringData, setMonitoringData] = useState<any>(null);
  const [loadingMonitoring, setLoadingMonitoring] = useState<boolean>(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);

  // Audio Alert State
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [audioPermissionNeeded, setAudioPermissionNeeded] = useState<boolean>(false);
  const [lastErrorCount, setLastErrorCount] = useState<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Verify auth token on mount
  useEffect(() => {
    const token = localStorage.getItem('lexflow_auth_token');
    if (!token) {
      setIsAuthenticated(false);
      setCheckingAuth(false);
      return;
    }

    fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setIsAuthenticated(true);
          setAuthToken(token);
        } else {
          localStorage.removeItem('lexflow_auth_token');
          setIsAuthenticated(false);
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
      })
      .finally(() => {
        setCheckingAuth(false);
      });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('lexflow_auth_token', data.token);
        setAuthToken(data.token);
        setIsAuthenticated(true);
        setLoginPassword('');
      } else {
        setLoginError(data.message || 'Senha incorreta.');
      }
    } catch (err: any) {
      setLoginError('Falha ao comunicar com o servidor.');
    }
  };

  const handleLogout = async () => {
    if (authToken) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: authToken }),
      }).catch(() => {});
    }
    localStorage.removeItem('lexflow_auth_token');
    setAuthToken('');
    setIsAuthenticated(false);
  };

  // Fetch monitoring status (isManual = true triggers live testing via ?test=true)
  const fetchMonitoring = async (isManual = false) => {
    if (!isAuthenticated || !authToken) return;
    setLoadingMonitoring(true);
    try {
      const endpoint = isManual ? '/api/monitoring/status?test=true' : '/api/monitoring/status';
      const res = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setMonitoringData(data);
        
        const currentErrors = data.summary?.errors || 0;
        if (isManual && currentErrors > 0 && currentErrors >= lastErrorCount && soundEnabled) {
          playAlertSound();
        } else if (!isManual && currentErrors > lastErrorCount && soundEnabled) {
          playAlertSound();
        }
        setLastErrorCount(currentErrors);
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error('Erro ao buscar status de monitoramento:', err);
    } finally {
      setLoadingMonitoring(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && authToken) {
      fetchMonitoring(false); // loads clean untested state on initial load
    }
  }, [isAuthenticated, authToken]);

  // Auto-refresh interval (every 30 seconds if enabled)
  useEffect(() => {
    if (!isAuthenticated || !autoRefresh) return;
    const interval = setInterval(() => {
      fetchMonitoring(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, autoRefresh, lastErrorCount, soundEnabled, authToken]);

  // Web Audio API Alert Sound
  const playAlertSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
      setAudioPermissionNeeded(false);
    } catch (e) {
      console.warn('Áudio bloqueado pelo navegador:', e);
      setAudioPermissionNeeded(true);
    }
  };

  const toggleSound = () => {
    if (!soundEnabled) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          if (!audioCtxRef.current) {
            audioCtxRef.current = new AudioContextClass();
          }
          if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
          }
        }
        setSoundEnabled(true);
        setAudioPermissionNeeded(false);
        playAlertSound();
      } catch (e) {
        setAudioPermissionNeeded(true);
      }
    } else {
      setSoundEnabled(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#101C2C] flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#C8A96B]" />
          <span className="text-sm font-medium">Carregando Lex Flow Pro Monitor...</span>
        </div>
      </div>
    );
  }

  // Login Screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#101C2C] text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-[#17364A]/80 backdrop-blur-md rounded-2xl border border-slate-700/80 p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-[#C8A96B] flex items-center justify-center text-[#101C2C] font-bold text-xl mx-auto tracking-tighter shadow-lg">
              LF
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Lex Flow Pro Monitor</h1>
            <p className="text-xs text-slate-300 font-mono">Central de Operações Protegida</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#C8A96B]" />
                <span>Senha Administrativa</span>
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="Digite a senha de acesso..."
                className="w-full px-4 py-2.5 bg-[#101C2C] border border-slate-600 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#C8A96B] transition-colors"
                required
              />
            </div>

            {loginError && (
              <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#C8A96B] hover:bg-[#b5985d] text-[#101C2C] font-semibold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Acessar Painel</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-4 border-t border-slate-700/60 text-center space-y-1">
            <p className="text-[11px] text-slate-400">
              Autenticação protegida no servidor com tokens de sessão.
            </p>
            <p className="text-[10px] text-slate-500 font-mono">
              Senha padrão (desenvolvimento): lexflow2026
            </p>
          </div>
        </div>
      </div>
    );
  }

  const summary = monitoringData?.summary || { total: 0, active: 0, errors: 0, pending: 0, lastChecked: null, durationMs: 0 };
  const services = monitoringData?.services || [];

  return (
    <div className="min-h-screen bg-[#101C2C] text-slate-100 flex flex-col font-sans">
      
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-30 bg-[#17364A]/90 backdrop-blur-md border-b border-slate-700/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#C8A96B] flex items-center justify-center text-[#101C2C] font-extrabold text-sm tracking-tighter shadow-md">
            LF
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              <span>Lex Flow</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#101C2C] text-[#C8A96B] border border-[#C8A96B]/30">
                PRO MONITOR
              </span>
            </h1>
            <p className="text-xs text-slate-300 font-mono">Central de Operações & Conexões</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Sound Alert Toggle */}
          <button
            onClick={toggleSound}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              soundEnabled 
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50' 
                : 'bg-[#101C2C] text-slate-400 border border-slate-700 hover:text-white'
            }`}
            title={soundEnabled ? 'Alerta sonoro ativado' : 'Alerta sonoro silenciado'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Som Ativo' : 'Silencioso'}</span>
          </button>

          {/* Test Sound Button */}
          {soundEnabled && (
            <button
              onClick={playAlertSound}
              className="px-2.5 py-2 bg-[#101C2C] hover:bg-slate-800 text-slate-300 rounded-xl text-xs border border-slate-700 transition-colors cursor-pointer"
              title="Testar som de alerta"
            >
              Testar Som
            </button>
          )}

          <div className="h-5 w-px bg-slate-700 hidden sm:block"></div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-[#101C2C] hover:bg-red-950/50 hover:text-red-300 hover:border-red-800/50 border border-slate-700 rounded-xl transition-all cursor-pointer"
            title="Encerrar sessão administrativa"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Browser Autoplay / Audio Permission Banner */}
      {audioPermissionNeeded && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>O navegador exigiu interação para permitir alertas sonoros. Clique em "Ativar Som" novamente.</span>
          </div>
          <button 
            onClick={toggleSound}
            className="px-3 py-1 bg-amber-500 text-[#101C2C] font-bold rounded-lg hover:bg-amber-400 transition-colors cursor-pointer"
          >
            Ativar Som
          </button>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        
        {/* Top Control Banner */}
        <div className="bg-[#17364A]/80 backdrop-blur-md rounded-2xl border border-slate-700/80 p-6 md:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${summary.errors > 0 ? 'bg-red-500 animate-ping' : summary.active > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
              <span>{summary.errors > 0 ? `${summary.errors} falha(s) detectada(s)` : summary.active > 0 ? 'Sistemas operacionais' : 'Painel em estado limpo (Não testado)'}</span>
              <span>·</span>
              <span>Última verificação: {summary.lastChecked ? new Date(summary.lastChecked).toLocaleTimeString('pt-BR') : 'Aguardando execução...'}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Painel de Operações & Diagnóstico
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Auditoria honesta em tempo real de APIs, webhooks e integrações externas do ecossistema Lex Flow.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => fetchMonitoring(true)}
              disabled={loadingMonitoring}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold text-[#101C2C] bg-[#C8A96B] hover:bg-[#b5985d] rounded-xl transition-all shadow-md disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loadingMonitoring ? 'animate-spin' : ''}`} />
              <span>Testar Todas as Conexões</span>
            </button>
          </div>
        </div>

        {/* Status Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-[#17364A]/60 rounded-xl border border-slate-700/80 p-5 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-300 mb-3">
              <span className="text-xs font-medium uppercase tracking-wider">Serviços Mapeados</span>
              <Server className="w-4 h-4 text-[#C8A96B]" />
            </div>
            <div className="text-2xl font-extrabold text-white tabular-nums">
              {summary.total}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Integrações configuradas
            </p>
          </div>

          <div className="bg-[#17364A]/60 rounded-xl border border-slate-700/80 p-5 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-300 mb-3">
              <span className="text-xs font-medium uppercase tracking-wider">Conexões Ativas (Verde)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 tabular-nums">
              {summary.active}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Testadas com sucesso
            </p>
          </div>

          <div className="bg-[#17364A]/60 rounded-xl border border-slate-700/80 p-5 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-300 mb-3">
              <span className="text-xs font-medium uppercase tracking-wider">Falhas (Vermelho)</span>
              <XCircle className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-extrabold text-red-400 tabular-nums">
              {summary.errors}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Erros na verificação
            </p>
          </div>

          <div className="bg-[#17364A]/60 rounded-xl border border-slate-700/80 p-5 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-300 mb-3">
              <span className="text-xs font-medium uppercase tracking-wider">Pendentes / Cinza</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-amber-400 tabular-nums">
              {summary.pending}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Aguardando execução
            </p>
          </div>

        </div>

        {/* Services List Cards */}
        <div className="bg-[#17364A]/80 rounded-2xl border border-slate-700/80 p-6 md:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-4">
            <div>
              <h3 className="text-base font-bold text-white">Status dos Serviços & Integrações</h3>
              <p className="text-xs text-slate-400">Clique em qualquer serviço para ver o diagnóstico detalhado e orientações</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span>Atualização automática (30s)</span>
              <button 
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${autoRefresh ? 'bg-[#C8A96B]' : 'bg-slate-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-[#101C2C] transition-transform ${autoRefresh ? 'translate-x-4' : 'translate-x-0'}`}></span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((svc: any) => {
              let statusBg = 'bg-slate-800/80 border-slate-700';
              let badgeColor = 'bg-slate-700 text-slate-300';
              let statusText = 'Não testado';
              let StatusIcon = Activity;

              if (svc.status === 'green') {
                statusBg = 'bg-emerald-950/30 border-emerald-800/50 hover:border-emerald-700';
                badgeColor = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
                statusText = 'Operacional';
                StatusIcon = CheckCircle2;
              } else if (svc.status === 'red' || svc.status === 'timeout') {
                statusBg = 'bg-red-950/40 border-red-800/60 hover:border-red-700';
                badgeColor = 'bg-red-500/20 text-red-300 border border-red-500/30';
                statusText = svc.status === 'timeout' ? 'Timeout' : 'Falha';
                StatusIcon = XCircle;
              } else if (svc.status === 'yellow') {
                statusBg = 'bg-amber-950/40 border-amber-800/60 hover:border-amber-700';
                badgeColor = 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
                statusText = 'Parcial / Credencial';
                StatusIcon = AlertTriangle;
              } else if (svc.status === 'gray') {
                statusBg = 'bg-slate-800/50 border-slate-700/60 hover:border-slate-600';
                badgeColor = 'bg-slate-700/50 text-slate-400 border border-slate-600/50';
                statusText = 'Não Testado';
                StatusIcon = Info;
              }

              return (
                <div
                  key={svc.id}
                  onClick={() => setSelectedService(svc)}
                  className={`rounded-xl border p-5 transition-all cursor-pointer flex flex-col justify-between gap-4 shadow-sm ${statusBg}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                        {svc.category}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badgeColor}`}>
                        <StatusIcon className="w-3 h-3" />
                        <span>{statusText}</span>
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white">{svc.name}</h4>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                        {svc.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-700/60 text-xs text-slate-400 font-mono">
                    <div className="flex items-center gap-2">
                      <span>HTTP {svc.httpCode || '—'}</span>
                      <span>·</span>
                      <span>{svc.responseTime ? `${svc.responseTime}ms` : '—'}</span>
                    </div>
                    <span className="text-[#C8A96B] hover:underline font-medium">Detalhes →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </main>

      {/* Detailed Diagnostic Modal */}
      {selectedService && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-[#17364A] rounded-2xl border border-slate-600 p-6 md:p-8 shadow-2xl space-y-6 text-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-700 pb-4">
              <div className="space-y-1">
                <span className="text-xs font-mono text-[#C8A96B] uppercase tracking-wider">{selectedService.category}</span>
                <h3 className="text-lg font-bold text-white">{selectedService.name}</h3>
              </div>
              <button
                onClick={() => setSelectedService(null)}
                className="w-8 h-8 rounded-full bg-[#101C2C] hover:bg-slate-800 flex items-center justify-center text-slate-300 text-sm font-bold cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 text-sm">
              <div className="grid grid-cols-2 gap-4 bg-[#101C2C] p-4 rounded-xl border border-slate-700/80 font-mono text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">Estado Atual:</span>
                  <span className={`font-bold uppercase ${selectedService.status === 'green' ? 'text-emerald-400' : selectedService.status === 'red' ? 'text-red-400' : selectedService.status === 'yellow' ? 'text-amber-400' : 'text-slate-400'}`}>
                    {selectedService.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Código HTTP:</span>
                  <span className="font-bold text-white">{selectedService.httpCode || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Tempo de Resposta:</span>
                  <span className="font-bold text-white">{selectedService.responseTime ? `${selectedService.responseTime}ms` : 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Último Teste:</span>
                  <span className="font-bold text-white">{selectedService.lastChecked ? new Date(selectedService.lastChecked).toLocaleTimeString('pt-BR') : 'Não testado'}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Descrição Técnica</h4>
                <p className="text-xs text-slate-200 bg-[#101C2C]/60 p-3.5 rounded-xl border border-slate-700/60 leading-relaxed font-mono">
                  {selectedService.description}
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-[#C8A96B] uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Orientação de Investigação</span>
                </h4>
                <p className="text-xs text-slate-200 bg-[#101C2C]/60 p-3.5 rounded-xl border border-slate-700/60 leading-relaxed">
                  {selectedService.guidance}
                </p>
              </div>

              {/* Event History Component */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#C8A96B]" />
                  <span>Histórico de Eventos (Últimas Verificações)</span>
                </h4>
                <div className="bg-[#101C2C]/80 p-3.5 rounded-xl border border-slate-700/80 space-y-2 font-mono text-xs">
                  {selectedService.history && selectedService.history.length > 0 ? (
                    selectedService.history.map((ev: any, idx: number) => {
                      const dotColor = ev.status === 'green' ? 'bg-emerald-400' : ev.status === 'red' ? 'bg-red-400' : ev.status === 'yellow' ? 'bg-amber-400' : 'bg-slate-500';
                      const textStatus = ev.status === 'green' ? 'Operacional' : ev.status === 'red' ? 'Falha' : ev.status === 'yellow' ? 'Pendente' : 'Não Testado';
                      return (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-800/80 last:border-0">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`}></span>
                            <span className="text-white font-medium">{textStatus}</span>
                            <span className="text-slate-400 text-[11px]">({new Date(ev.timestamp).toLocaleTimeString('pt-BR')})</span>
                          </div>
                          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                            <span>HTTP {ev.httpCode || '—'}</span>
                            <span>{ev.responseTime ? `${ev.responseTime}ms` : '—'}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-slate-400 text-center py-2">Nenhum evento registrado ainda.</p>
                  )}
                </div>
              </div>

            </div>

            <div className="pt-4 border-t border-slate-700 flex justify-end">
              <button
                onClick={() => setSelectedService(null)}
                className="px-5 py-2.5 bg-[#C8A96B] hover:bg-[#b5985d] text-[#101C2C] font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
              >
                Fechar Diagnóstico
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-[#17364A]/40 border-t border-slate-700/60 px-6 py-4 text-center text-xs text-slate-400">
        Lex Flow Pro Monitor · Pronto para Implantação Segura na Vercel
      </footer>

    </div>
  );
}
