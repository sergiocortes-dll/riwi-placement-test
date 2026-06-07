import React, { useState, useEffect } from "react";
import { 
  Users, 
  Lock, 
  Unlock, 
  Settings, 
  ShieldCheck, 
  Trash2, 
  AlertCircle, 
  X, 
  RefreshCw, 
  CheckCircle, 
  Search, 
  UserMinus, 
  ArrowLeft,
  KeyRound,
  Database,
  LogOut,
  Layers
} from "lucide-react";

interface AdminPanelProps {
  onClose: () => void;
  currentStudentEmail?: string;
  onUnlockEmail: (email: string) => void;
  onResetCooldown: (email: string) => void;
  currentVersion: string;
}

interface BlockedItem {
  email: string;
  name: string;
  blockedAt: string;
  reason: string;
}

interface AttemptItem {
  name: string;
  email: string;
  attempts: number;
  lastAttemptAt: string;
}

export default function AdminPanel({ 
  onClose, 
  currentStudentEmail, 
  onUnlockEmail, 
  onResetCooldown,
  currentVersion
}: AdminPanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passError, setPassError] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [blockedList, setBlockedList] = useState<BlockedItem[]>([]);
  const [attemptsList, setAttemptsList] = useState<AttemptItem[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<"blocked" | "attempts" | "manual" | "questions" | "versions">("blocked");
  
  // Manual toggle inputs
  const [manualEmail, setManualEmail] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualSuccessMsg, setManualSuccessMsg] = useState("");

  const DEFAULT_USER = "admin@riwi.co";
  const DEFAULT_USER_ALT = "admin";
  const DEFAULT_PASSCODE = "admin123";

  // Check auth on load
  useEffect(() => {
    const isSavedAuth = sessionStorage.getItem("riwi_admin_session_active") === "true";
    if (isSavedAuth) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    if ((cleanUser === DEFAULT_USER || cleanUser === DEFAULT_USER_ALT) && password === DEFAULT_PASSCODE) {
      setIsAuthenticated(true);
      setPassError(false);
      sessionStorage.setItem("riwi_admin_session_active", "true");
      sessionStorage.setItem("riwi_admin_username", cleanUser);
    } else {
      setPassError(true);
      setTimeout(() => setPassError(false), 3000);
    }
  };

  const handleLogOut = () => {
    setIsAuthenticated(false);
    setUsername("");
    setPassword("");
    sessionStorage.removeItem("riwi_admin_session_active");
    sessionStorage.removeItem("riwi_admin_username");
  };

  const loadData = () => {
    // Load blocked list
    const blockedStr = localStorage.getItem("riwi_placement_blocked_emails_v1");
    if (blockedStr) {
      try {
        const obj = JSON.parse(blockedStr);
        const list = Object.values(obj) as BlockedItem[];
        setBlockedList(list.sort((a, b) => new Date(b.blockedAt).getTime() - new Date(a.blockedAt).getTime()));
      } catch (e) {
        setBlockedList([]);
      }
    } else {
      setBlockedList([]);
    }

    // Load attempts list
    const attemptsStr = localStorage.getItem("riwi_placement_attempts_v1");
    if (attemptsStr) {
      try {
        const obj = JSON.parse(attemptsStr);
        const list = Object.values(obj) as AttemptItem[];
        setAttemptsList(list.sort((a, b) => new Date(b.lastAttemptAt).getTime() - new Date(a.lastAttemptAt).getTime()));
      } catch (e) {
        setAttemptsList([]);
      }
    } else {
      setAttemptsList([]);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const handleUnlockClick = (email: string) => {
    onUnlockEmail(email);
    // Reload local state to update UI list
    setTimeout(() => {
      loadData();
    }, 50);
  };

  const handleResetCooldownClick = (email: string) => {
    onResetCooldown(email);
    setTimeout(() => {
      loadData();
    }, 50);
  };

  const handleManualBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEmail.trim()) return;

    const emailToBlock = manualEmail.trim().toLowerCase();
    const candidateName = manualName.trim() || "Manual Candidate Override";

    const blockedStr = localStorage.getItem("riwi_placement_blocked_emails_v1");
    const blockedMap = blockedStr ? JSON.parse(blockedStr) : {};
    blockedMap[emailToBlock] = {
      email: emailToBlock,
      name: candidateName,
      blockedAt: new Date().toISOString(),
      reason: "Blocked manually by Administrator portal override"
    };

    localStorage.setItem("riwi_placement_blocked_emails_v1", JSON.stringify(blockedMap));
    setManualSuccessMsg(`El correo ${emailToBlock} ha sido BLOQUEADO con éxito.`);
    setManualEmail("");
    setManualName("");
    loadData();

    setTimeout(() => {
      setManualSuccessMsg("");
    }, 4000);
  };

  const handleManualUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEmail.trim()) return;

    const emailToUnlock = manualEmail.trim().toLowerCase();
    onUnlockEmail(emailToUnlock);
    onResetCooldown(emailToUnlock);
    
    setManualSuccessMsg(`El correo ${emailToUnlock} ha sido DESBLOQUEADO (incluyendo cooldowns) con éxito.`);
    setManualEmail("");
    setManualName("");
    loadData();

    setTimeout(() => {
      setManualSuccessMsg("");
    }, 4000);
  };

  const handleResetEverythingAtOnce = () => {
    if (window.confirm("¿Seguro que deseas eliminar el historial de intentos y todos los bloqueos permanentemente?")) {
      localStorage.removeItem("riwi_placement_blocked_emails_v1");
      localStorage.removeItem("riwi_placement_attempts_v1");
      loadData();
      alert("Todos los registros han sido reiniciados.");
    }
  };

  const loadMockCheaters = () => {
    const listToLoad: Record<string, BlockedItem> = {
      "andrea.mora@riwi.co": {
        email: "andrea.mora@riwi.co",
        name: "Andrea Mora",
        blockedAt: new Date(Date.now() - 3600000).toISOString(),
        reason: "Abrió otra pestaña o abandonó la ventana del examen"
      },
      "santiago.perez@riwi.co": {
        email: "santiago.perez@riwi.co",
        name: "Santiago Perez",
        blockedAt: new Date(Date.now() - 7200000).toISOString(),
        reason: "Cambió de pestaña o aplicación activa durante Writing"
      }
    };
    localStorage.setItem("riwi_placement_blocked_emails_v1", JSON.stringify(listToLoad));
    
    // Also load mock attempts
    const attemptsToLoad: Record<string, AttemptItem> = {
      "andrea.mora@riwi.co": {
        name: "Andrea Mora",
        email: "andrea.mora@riwi.co",
        attempts: 2,
        lastAttemptAt: new Date(Date.now() - 3600000).toISOString()
      },
      "santiago.perez@riwi.co": {
        name: "Santiago Perez",
        email: "santiago.perez@riwi.co",
        attempts: 1,
        lastAttemptAt: new Date(Date.now() - 7200000).toISOString()
      },
      "kate.s.acosta@gmail.com": {
        name: "Kate S. Acosta",
        email: "kate.s.acosta@gmail.com",
        attempts: 1,
        lastAttemptAt: new Date().toISOString()
      }
    };
    localStorage.setItem("riwi_placement_attempts_v1", JSON.stringify(attemptsToLoad));
    loadData();
  };

  // Filtered lists
  const filteredBlocked = blockedList.filter(item => 
    item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAttempts = attemptsList.filter(item => 
    item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Auth/Login screen
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/85 backdrop-blur-md font-sans" id="admin-auth-modal">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
          
          {/* Header */}
          <div className="bg-slate-950 p-6 text-white text-center relative border-b border-slate-800">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
            <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-center justify-center text-indigo-400 mx-auto mb-3">
              <KeyRound size={22} id="admin-login-icon" />
            </div>
            <h3 className="text-base font-extrabold tracking-tight font-sans">RIWI Portal Docente</h3>
            <p className="text-slate-400 text-xs mt-1">Ingresa tus credenciales para administrar exámenes y versiones.</p>
          </div>
          
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            
            {/* Username/Email Input */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Usuario o Correo
              </label>
              <input
                type="text"
                autoFocus
                required
                placeholder="admin@riwi.co o admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-xs outline-none transition-all font-sans ${
                  passError 
                    ? "border-red-500 ring-1 ring-red-500 text-red-600 bg-red-50"
                    : "border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500"
                }`}
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Contraseña
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-xs outline-none transition-all font-mono ${
                  passError 
                    ? "border-red-500 ring-1 ring-red-500 text-red-600 bg-red-50"
                    : "border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500"
                }`}
              />
              {passError && (
                <p className="text-red-500 text-[11px] text-center font-bold font-sans pt-1">
                  Credenciales incorrectas. Intenta de nuevo.
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-250 rounded-lg text-xs font-bold text-slate-700 cursor-pointer transition-all"
              >
                Volver al Examen
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer transition-all active:scale-[0.98]"
              >
                Iniciar Sesión
              </button>
            </div>

            {/* Hint Banner */}
            <div className="text-[10px] text-slate-500 text-center uppercase tracking-widest bg-slate-50 p-3 rounded-lg border border-slate-200/60 font-mono mt-2">
              Credenciales por defecto:<br />
              <div className="mt-1 font-bold">
                Usuario: <span className="text-indigo-600 select-all font-extrabold">admin</span> o <span className="text-indigo-600 select-all font-extrabold">admin@riwi.co</span><br />
                Clave: <span className="text-indigo-600 select-all font-extrabold">admin123</span>
              </div>
            </div>

          </form>
        </div>
      </div>
    );
  }

  // Active Admin Workspace Panel
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" id="admin-dashboard-container">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden animate-fade-in">
        
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4.5 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
              <Settings size={20} />
            </div>
            <div>
              <h2 className="font-display font-black text-base text-white">RIWI Security & Administration Panel</h2>
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest mt-1 block">
                Manage Locks, Attempt Cooldowns & Profile Overrides
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogOut}
              className="px-3 py-1.5 bg-red-950/40 border border-red-900/30 text-red-300 hover:text-red-150 hover:bg-red-950/60 transition-all rounded-lg flex items-center gap-1.5 text-xs cursor-pointer font-bold font-sans"
            >
              <LogOut size={13} />
              Cerrar Sesión
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-all flex items-center gap-1 text-xs cursor-pointer font-bold font-sans"
            >
              <X size={14} />
              Salir Panel
            </button>
          </div>
        </div>

        {/* Tabs & Search controls bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex bg-slate-200/60 p-1.5 rounded-lg border border-slate-200/50 gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveSubTab("blocked")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === "blocked" 
                  ? "bg-slate-950 text-white shadow-xs" 
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              <Lock size={13} />
              Cuentas Bloqueadas ({blockedList.length})
            </button>
            <button
              onClick={() => setActiveSubTab("attempts")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === "attempts" 
                  ? "bg-slate-950 text-white shadow-xs" 
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              <Users size={13} />
              Historial de Intentos ({attemptsList.length})
            </button>
            <button
              onClick={() => setActiveSubTab("manual")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === "manual" 
                  ? "bg-slate-950 text-white shadow-xs" 
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              <Database size={13} />
              Acciones Manuales
            </button>
            <button
              onClick={() => setActiveSubTab("questions")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === "questions" 
                  ? "bg-slate-950 text-white shadow-xs" 
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              <Database size={13} />
              Base del Examen (.JS)
            </button>
            <button
              onClick={() => setActiveSubTab("versions")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === "versions" 
                  ? "bg-slate-950 text-white shadow-xs" 
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              <Layers size={13} />
              Versiones del Examen
            </button>
          </div>

          <div className="flex items-center gap-3">
            {(activeSubTab === "blocked" || activeSubTab === "attempts") && (
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar estudiante o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8.5 pr-4 py-1.5 border border-slate-250 bg-white rounded-lg text-xs w-56 outline-none focus:border-indigo-600 font-sans"
                />
              </div>
            )}
            <button
              onClick={loadData}
              title="Refresh lists"
              className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 shadow-3xs cursor-pointer active:scale-95"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* Dynamic content scrollable container */}
        <div className="flex-1 overflow-y-auto p-6" id="admin-panel-dynamic-body">
          
          {/* TAB 1: BLOCK LIST */}
          {activeSubTab === "blocked" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Estudiantes Retenidos / Bloqueados</h3>
                  <p className="text-[11px] text-slate-500">
                    Cuentas inhabilitadas automáticamente por intentar salir o cambiar la pestaña de la prueba de colocación.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={loadMockCheaters}
                    className="px-2.5 py-1.5 border border-dashed border-indigo-300 bg-indigo-50/50 text-indigo-700 text-[10px] font-bold rounded hover:bg-indigo-50 transition-all cursor-pointer"
                  >
                    + Cargar Simulación de Bloqueos (Test)
                  </button>
                  <button
                    onClick={handleResetEverythingAtOnce}
                    className="px-2.5 py-1.5 border border-red-200 bg-red-50 text-red-700 text-[10px] font-bold rounded hover:bg-red-100 transition-all cursor-pointer"
                  >
                    Limpiar Todo
                  </button>
                </div>
              </div>

              {filteredBlocked.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 border border-slate-150 rounded-xl space-y-2">
                  <ShieldCheck size={40} className="text-emerald-500 mx-auto" />
                  <h4 className="text-slate-800 font-bold text-xs">¡No hay correos bloqueados en este momento!</h4>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto leading-relaxed">
                    Todos los alumnos están limpios de infracciones transitorias, o bien no han iniciado sesión aún. ¡Excelente integridad académica!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredBlocked.map((item) => {
                    const isActiveTarget = currentStudentEmail && currentStudentEmail.toLowerCase() === item.email.toLowerCase();
                    return (
                      <div 
                        key={item.email} 
                        className={`p-4 rounded-xl border flex flex-col justify-between gap-3 shadow-3xs transition-all ${
                          isActiveTarget 
                            ? "border-rose-300 bg-rose-50/50 ring-2 ring-rose-500/20 animate-pulse" 
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900 text-xs truncate max-w-xs">{item.name}</span>
                            <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[9px] font-mono tracking-wider rounded uppercase font-bold">
                              Cheating Lock
                            </span>
                          </div>
                          
                          <div className="text-[11px] font-mono text-slate-500 font-bold break-all">
                            {item.email}
                          </div>

                          <div className="bg-slate-100 rounded p-2 text-[10px] text-slate-600 italic leading-relaxed">
                            "{item.reason || "Sin razón guardada"}"
                          </div>

                          <div className="text-[10px] text-slate-400 font-sans">
                            <strong>Bloqueado el:</strong> {new Date(item.blockedAt).toLocaleString()}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                          {isActiveTarget && (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-150 rounded px-1.5 py-0.5">
                              🔴 Alumno Actual
                            </span>
                          )}
                          <button
                            onClick={() => handleUnlockClick(item.email)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded px-3 py-1.5 text-[11px] font-bold flex items-center gap-1.5 ml-auto transition-all active:scale-95 cursor-pointer shadow-3xs"
                          >
                            <Unlock size={11} />
                            Desbloquear Acceso
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ATTEMPTS / COOLDOWN HISTORY */}
          {activeSubTab === "attempts" && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Historial de Turnos & Cooldowns</h3>
                <p className="text-[11px] text-slate-500">
                  Lista de correos que han registrado intentos en el examen. El sistema restringe re-tomar la evaluación obligatoriamente durante 72 horas para prevenir copiado, pero puedes liberarlos inmediatamente como instructor.
                </p>
              </div>

              {filteredAttempts.length === 0 ? (
                <div className="p-10 text-center bg-slate-50 border border-slate-150 rounded-xl">
                  <p className="text-slate-500 text-xs">No se encontraron registros de intentos de alumnos en este dispositivo.</p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-3xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-[10px] font-mono uppercase text-slate-400 tracking-wider border-b border-slate-150">
                        <tr>
                          <th className="px-4 py-3 font-extrabold">Estudiante</th>
                          <th className="px-4 py-3 font-extrabold">Email</th>
                          <th className="px-4 py-3 font-extrabold text-center">Intentos</th>
                          <th className="px-4 py-3 font-extrabold">Última Prueba</th>
                          <th className="px-4 py-3 font-extrabold">Estado de Cooldown</th>
                          <th className="px-4 py-3 font-extrabold text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAttempts.map((item) => {
                          const lastT = new Date(item.lastAttemptAt).getTime();
                          const diff = Date.now() - lastT;
                          const period = 72 * 60 * 60 * 1000;
                          const inCooldown = diff < period;
                          const hoursRemaining = inCooldown ? Math.ceil((period - diff) / (3600 * 1000)) : 0;

                          return (
                            <tr key={item.email} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 font-bold text-slate-800">{item.name}</td>
                              <td className="px-4 py-3 font-mono break-all">{item.email}</td>
                              <td className="px-4 py-3 text-center font-bold font-mono">
                                <span className="bg-slate-100 rounded px-2 py-0.5">{item.attempts}</span>
                              </td>
                              <td className="px-4 py-3 text-slate-500">
                                {new Date(item.lastAttemptAt).toLocaleString()}
                              </td>
                              <td className="px-4 py-3">
                                {inCooldown ? (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>
                                    Bloqueado (~{hoursRemaining}h rest.)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-100">
                                    ✓ Habilitado / Libre
                                  </span>
                                )};
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleResetCooldownClick(item.email)}
                                  className="px-2.5 py-1 border border-slate-205 hover:border-red-300 hover:text-red-700 hover:bg-red-50 text-[10.5px] font-bold rounded-md transition-all cursor-pointer inline-flex items-center gap-1"
                                  title="Borrar intentos para quitar bloqueo temporal de 72 horas"
                                >
                                  <UserMinus size={11} />
                                  Liberar Cooldown
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: OVERRIDES & MANUAL ACTIONS */}
          {activeSubTab === "manual" && (
            <div className="space-y-6 max-w-xl mx-auto">
              <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-xl text-xs space-y-1.5">
                <h4 className="font-bold text-slate-800 flex items-center gap-1 text-[12px] uppercase tracking-wider font-mono">
                  <ShieldCheck size={14} className="text-indigo-600" />
                  Manual Override Center
                </h4>
                <p className="text-slate-500 leading-relaxed">
                  Permite intervenir de forma inmediata en las directrices de seguridad de navegación para desbloquear o forzar bloqueos a direcciones de correo electrónico específicas.
                </p>
              </div>

              {manualSuccessMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-2xs">
                  <CheckCircle size={15} className="text-emerald-600 shrink-0" />
                  <p>{manualSuccessMsg}</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6">
                
                {/* Manual Form */}
                <div className="border border-slate-200 bg-white p-5 rounded-xl space-y-4 shadow-3xs">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest font-mono">Interactuar con un Correo</h4>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono">Nombre del Estudiante</label>
                        <input
                          type="text"
                          placeholder="p. ej. Andrea Mora"
                          value={manualName}
                          onChange={(e) => setManualName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs outline-none focus:border-indigo-600"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono">Correo de Referencia *</label>
                        <input
                          type="email"
                          required
                          placeholder="estudiante@riwi.co"
                          value={manualEmail}
                          onChange={(e) => setManualEmail(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs font-mono outline-none focus:border-indigo-600"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={handleManualUnlockSubmit}
                        disabled={!manualEmail.trim()}
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Unlock size={12} />
                        Forzar Desbloqueo Completo
                      </button>

                      <button
                        type="button"
                        onClick={handleManualBlock}
                        disabled={!manualEmail.trim()}
                        className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Lock size={12} />
                        Anular y Bloquear Cuenta
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bulk tools */}
                <div className="border border-red-100 bg-red-50/20 p-5 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-red-950 uppercase tracking-widest font-mono flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-red-600 animate-pulse" />
                    Danger Zone / Herramientas Masivas
                  </h4>
                  <p className="text-[11.5px] text-slate-500 leading-relaxed">
                    Estas acciones limpian las bases de seguridad locales de este navegador. Utilízalas si requieres reiniciar la base para un nuevo grupo o jornada de exámenes de colocación.
                  </p>
                  <div className="pt-2 flex justify-start">
                    <button
                      onClick={handleResetEverythingAtOnce}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm shadow-red-100"
                    >
                      <Trash2 size={13} />
                      Eliminar TODOS los Bloqueos e Intentos (Reset General)
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeSubTab === "questions" && (
            <div className="space-y-6">
              <div className="pb-2 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Base de Datos de Preguntas (.JS)</h3>
                  <p className="text-[11px] text-slate-500 font-sans">
                    Descarga o copia la base de datos completa con las preguntas de las Versiones A, B, C y D en formato JavaScript estándar para integración técnica.
                  </p>
                </div>
                <a
                  href="/api/download-questions-js"
                  download="questions_exam_versions.js"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-150 cursor-pointer active:scale-95 text-center leading-none"
                >
                  Descargar Código JavaScript (.JS)
                </a>
              </div>

              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-5 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                  Instrucciones de Uso Técnico
                </h4>
                <div className="text-[11.5px] text-slate-600 space-y-2 leading-relaxed font-sans">
                  <p>
                    La base de datos contiene cuatro conjuntos de examen completos exportados como arreglos puros de JavaScript.
                    La estructura incluye:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>useOfEnglishQuestions</strong>: 20 preguntas de opción múltiple estructuradas de nivel A1 a C2.</li>
                    <li><strong>readingSections</strong>: Textos con sus respectivas preguntas de desarrollo y opción múltiple.</li>
                    <li><strong>listeningSections</strong>: Los audios transcritos estructurados con preguntas y claves.</li>
                    <li><strong>writingTasks</strong>: Dos tareas de expresión escrita (tareas de ensayo e informe formal).</li>
                    <li><strong>speakingQuestions</strong>: Lista de preguntas para el asistente vocal de inteligencia artificial.</li>
                  </ul>
                  <p className="pt-2">
                    Puedes descargar el archivo completo haciendo clic en el botón superior, o utilizar la siguiente plantilla sintáctica para integrar estos exámenes en cualquier aplicación externa:
                  </p>
                </div>

                <div className="bg-slate-950 text-slate-300 rounded-lg p-4 text-[11px] font-mono overflow-x-auto max-h-60 border border-slate-800">
                  <pre>{`// Estructura de Datos de Preguntas en JavaScript (Versión de Ejemplo)
export const examContent = {
  version: "A",
  useOfEnglishQuestions: [
    {
      id: "g1",
      number: 1,
      question: "My name ___ Laura.",
      options: [
        { key: "a", text: "are" },
        { key: "b", text: "is" },
        { key: "c", text: "am" },
        { key: "d", text: "be" }
      ],
      correctKey: "b"
    },
    // ... 19 preguntas más de gramática
  ],
  readingSections: [
    {
      title: "Reading: Part 1 - General Business Guidelines",
      text: "The modern workspace is increasingly relying on hybrid coordinates...",
      openQuestions: [
        { number: 11, question: "What is mentioned as a major driver for hybrid flexibility?" }
      ],
      mcqQuestions: [
        {
          id: "r11",
          number: 11,
          question: "Which office scheduling practice is described as traditional?",
          options: [
            { key: "a", text: "Rotational shift models" },
            { key: "b", text: "Strict fixed-hour models" },
            { key: "c", text: "Ad-hoc hot-desking" }
          ],
          correctKey: "b"
        }
      ]
    }
  ],
  listeningSections: [
    {
      title: "Listening Part: Global Supply Logistics",
      transcript: "Welcome to today's review on international supply chains...",
      questions: [
        { number: 16, question: "Identify the primary source of delays mentioned in maritime shipping." }
      ]
    }
  ],
  writingTasks: [
    {
      id: "w1",
      title: "Writing Task 1 (Suggested: 150-180 words)",
      wordRange: { min: 150, max: 180 },
      topics: [
        { id: 1, text: "Write an email describing office organization suggestions..." }
      ]
    }
  ],
  speakingQuestions: [
    "What are your main professional goals for the next five years?",
    "How do you usually handle stressful situations at work or school?"
  ]
};`}</pre>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "versions" && (
            <div className="space-y-6">
              <div className="pb-3 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Control de Versiones del Examen</h3>
                  <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                    Modifica de manera centralizada la versión del examen que rinden los candidatos actualmente.
                  </p>
                </div>
                <div className="bg-indigo-50 border border-indigo-150 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0 shadow-3xs">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  <span className="text-[11px] text-indigo-700 font-mono font-bold uppercase tracking-wider">Versión actual: {currentVersion}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {["A", "B", "C", "D"].map((v) => {
                  const isActive = currentVersion === v;
                  return (
                    <div 
                      key={v}
                      className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                        isActive 
                          ? "bg-indigo-50/45 border-indigo-200 shadow-md shadow-indigo-50/20" 
                          : "bg-white border-slate-200 hover:border-slate-300 shadow-3xs hover:shadow-2xs"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="h-6 px-2.5 bg-indigo-50 border border-indigo-100 rounded text-[10px] font-mono font-bold tracking-widest text-indigo-600 flex items-center justify-center">
                            VERSIÓN {v}
                          </span>
                          {isActive && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-150 text-[10px] rounded font-bold uppercase tracking-wider font-sans">
                              Activa
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                            {v === "A" && "Evaluación Inicial"}
                            {v === "B" && "Alternativa Técnica"}
                            {v === "C" && "Comprensión Avanzada"}
                            {v === "D" && "Desarrollo Rápido"}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed font-sans">
                            {v === "A" && "Gramática general, lectura de hybrid guidelines y transporte marítimo global."}
                            {v === "B" && "Variaciones gramaticales adicionales, lecturas de metodologías ágiles de ingeniería."}
                            {v === "C" && "Evaluación avanzada de negociación de contratos, finanzas y despliegues técnicos."}
                            {v === "D" && "Enfoque de respuestas para equipos de TI, desarrollo técnico acelerado y APIs."}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (isActive) return;
                          if (window.confirm(`¿Estás seguro de que deseas cambiar el examen global a la Versión ${v}? Todos los estudiantes nuevos verán esta versión.`)) {
                            localStorage.setItem("riwi_active_exam_version", v);
                            window.location.search = `?version=${v}`;
                          }
                        }}
                        disabled={isActive}
                        className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${
                          isActive
                            ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-95 shadow-sm shadow-indigo-100"
                        }`}
                      >
                        {isActive ? "Versión Activa" : `Activar Versión ${v}`}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3 text-slate-800">
                <AlertCircle className="shrink-0 text-slate-500 mt-0.5" size={16} />
                <div className="text-[11.5px] leading-relaxed font-sans">
                  <p className="font-bold text-slate-900">Nota de Redirección Automática:</p>
                  <p className="mt-0.5 text-slate-600">
                    Al cambiar y activar una de las cuatro versiones disponibles de examen en JavaScript, la plataforma aplicará los cambios en <code className="font-mono bg-slate-200 px-1 py-0.5 rounded text-slate-800 text-[10px]">localStorage</code> y recargará automáticamente la aplicación con el parámetro URL para asegurar que las variables de preguntas se limpien y reorganicen.
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer info banner */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-500 gap-2">
          <span className="font-medium">
            RIWI Placement Test &middot; Administrador Académico
          </span>
          <span className="font-mono text-[10px] bg-slate-200/60 rounded px-2 py-0.5">
            Local Storage DB Driver Engine
          </span>
        </div>

      </div>
    </div>
  );
}
