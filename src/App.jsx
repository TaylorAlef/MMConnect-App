import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowRight, Bell, CalendarDays, Check, CheckCircle2,
  ChevronRight, Clock3, Command, FileText, Filter, Gauge, LayoutDashboard, LogOut,
  Moon, MoreHorizontal, PanelLeft, PlugZap, Plus, RefreshCw, Search, Settings2,
  ShieldCheck, Sparkles, Sun, UserPlus, Users, X, Zap, CircleDot
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

const navItems = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'people', label: 'Pessoas', icon: Users },
  { id: 'attendance', label: 'Ponto & Horários', icon: Clock3 },
  { id: 'leaves', label: 'Férias & Ausências', icon: CalendarDays },
  { id: 'audit', label: 'Auditoria', icon: ShieldCheck },
  { id: 'integrations', label: 'Integrações', icon: PlugZap },
];

const demoEmployees = [
  { id: 'demo-1', employee_code: 'TC-001', full_name: 'João Martins', email: 'joao@empresa.pt', status: 'ACTIVE', role: 'Operações' },
  { id: 'demo-2', employee_code: 'TC-002', full_name: 'Marta Silva', email: 'marta@empresa.pt', status: 'ACTIVE', role: 'Financeiro' },
  { id: 'demo-3', employee_code: 'TC-003', full_name: 'Rui Costa', email: 'rui@empresa.pt', status: 'ACTIVE', role: 'Comercial' },
];

const demoApprovals = [
  { id: 'v-1', type: 'Férias', title: 'João Martins', meta: '12–16 Mar · 5 dias', icon: CalendarDays },
  { id: 'o-1', type: 'Horas extra', title: 'Marta Silva', meta: '120 min · Fecho mensal', icon: Clock3 },
  { id: 'a-1', type: 'Ajuste', title: 'Rui Costa', meta: '07 Mar · entrada em falta', icon: FileText },
];

const demoAnomalies = [
  { severity: 'high', title: '2 jornadas sem fecho', detail: 'Falta de saída registada em dias recentes.' },
  { severity: 'medium', title: 'Pico de horas extra', detail: 'Horas extra acima do padrão do período.' },
  { severity: 'low', title: 'Atrasos concentrados', detail: 'Maior incidência numa equipa operacional.' },
];

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('teconnect-theme') || 'dark');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('teconnect-theme', theme);
  }, [theme]);
  return [theme, setTheme];
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'TC';
}

async function fetchProfile() {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('get_my_profile');
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

function App() {
  const [theme, setTheme] = useTheme();
  const [page, setPage] = useState('overview');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [employees, setEmployees] = useState(demoEmployees);
  const [profile, setProfile] = useState(null);
  const [companyName, setCompanyName] = useState('A sua organização');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const notify = (message, kind = 'success') => {
    setToast({ message, kind });
    window.setTimeout(() => setToast(null), 2600);
  };

  const loadEmployees = async () => {
    if (!supabase || !profile?.company_id) {
      setEmployees(demoEmployees);
      return;
    }
    const { data, error } = await supabase
      .from('employees')
      .select('id,employee_code,full_name,email,hire_date,status,department_id,position_id')
      .eq('company_id', profile.company_id)
      .order('full_name')
      .limit(500);
    if (error) throw error;
    setEmployees(data || []);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          if (!alive) return;
          if (data.session) {
            const nextProfile = await fetchProfile();
            if (!alive) return;
            setProfile(nextProfile);
            if (nextProfile?.company_name) setCompanyName(nextProfile.company_name);
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    const listener = supabase?.auth.onAuthStateChange?.((_event, session) => {
      if (!session) setProfile(null);
    });
    return () => {
      alive = false;
      listener?.data?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (profile?.company_id) {
      loadEmployees().catch((error) => {
        console.error(error);
        notify('Não foi possível atualizar a lista de pessoas.', 'error');
      });
    }
  }, [profile?.company_id]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
      if (event.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const openPage = (nextPage) => {
    setPage(nextPage);
    setPaletteOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
    notify('Sessão terminada.');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">T</div>
          <div><strong>Teconnect</strong><span>People OS</span></div>
          <button className="icon-button mobile-hide" aria-label="Recolher navegação"><PanelLeft size={17} /></button>
        </div>
        <div className="workspace">
          <div className="avatar avatar-sm">{initials(profile?.full_name || 'Administrador')}</div>
          <div className="workspace-text"><strong>{companyName}</strong><span>{profile?.role || 'Administrador'}</span></div>
          <ChevronRight size={16} className="muted" />
        </div>
        <nav className="nav-stack">
          <div className="nav-label">Operação</div>
          {navItems.slice(0, 4).map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => openPage(id)}>
              <Icon size={18} /><span>{label}</span>{id === 'leaves' && <span className="nav-badge">3</span>}
            </button>
          ))}
          <div className="nav-label">Controlo</div>
          {navItems.slice(4).map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => openPage(id)}><Icon size={18} /><span>{label}</span></button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}<span>{theme === 'dark' ? 'Modo claro' : 'Modo escuro'}</span>
          </button>
          <button className="nav-item" onClick={signOut}><LogOut size={18} /><span>Terminar sessão</span></button>
          <div className="secure-chip"><ShieldCheck size={14} /> Sessão protegida</div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="breadcrumbs"><span>Teconnect</span><ChevronRight size={15} /><strong>{navItems.find((item) => item.id === page)?.label}</strong></div>
          <div className="topbar-actions">
            <button className="command-trigger" onClick={() => setPaletteOpen(true)}><Search size={17} /><span>Pesquisar ou executar</span><kbd><span>⌘</span>K</kbd></button>
            <button className="icon-button notification" aria-label="Notificações"><Bell size={18} /><i /></button>
            <div className="avatar">{initials(profile?.full_name || 'Administrador')}</div>
          </div>
        </header>
        <div className="content">
          {loading ? <Loading /> : (
            <>
              {page === 'overview' && <Dashboard employees={employees} onNavigate={openPage} onAdd={() => setDrawerOpen(true)} notify={notify} />}
              {page === 'people' && <PeoplePage employees={employees} onAdd={() => setDrawerOpen(true)} />}
              {page === 'attendance' && <AttendancePage employees={employees} />}
              {page === 'leaves' && <ApprovalsPage notify={notify} />}
              {page === 'audit' && <AuditPage />}
              {page === 'integrations' && <IntegrationsPage />}
            </>
          )}
        </div>
      </main>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} onNavigate={openPage} onAdd={() => { setDrawerOpen(true); setPaletteOpen(false); }} />}
      {drawerOpen && <EmployeeDrawer companyId={profile?.company_id} onClose={() => setDrawerOpen(false)} onCreated={async (employee) => { setEmployees((current) => [employee, ...current]); setDrawerOpen(false); notify(`${employee.full_name} foi adicionado.`); await loadEmployees().catch(() => {}); }} notify={notify} />}
      {toast && <div className={`toast ${toast.kind}`}><CheckCircle2 size={17} /><span>{toast.message}</span></div>}
      <div className="sync-pill"><span className="sync-dot" /> Dados sincronizados</div>
    </div>
  );
}

function Loading() {
  return <div className="loading-screen"><div className="brand-mark large">T</div><strong>A preparar o Teconnect</strong><span>Sincronização segura a iniciar…</span></div>;
}

function Dashboard({ employees, onNavigate, onAdd, notify }) {
  const active = employees.filter((item) => item.status === 'ACTIVE').length;
  const [approvals, setApprovals] = useState(demoApprovals);
  const [refreshing, setRefreshing] = useState(false);
  const approve = (item) => { setApprovals((current) => current.filter((entry) => entry.id !== item.id)); notify(`${item.title}: pedido tratado.`); };
  const refresh = async () => { setRefreshing(true); await new Promise((resolve) => setTimeout(resolve, 500)); setRefreshing(false); notify('Dados atualizados.'); };
  const stats = [
    ['Pessoas ativas', active, '+6,4%', 'vs. período anterior', Users],
    ['Presenças hoje', '94,8%', '+2,1%', 'dentro da jornada', Clock3],
    ['Pendências', approvals.length, approvals.length ? 'Requer ação' : 'Em dia', 'aprovações humanas', CheckCircle2],
    ['Risco operacional', '12/100', 'Baixo', 'auditoria preditiva', Gauge],
  ];
  return <>
    <section className="page-hero"><div><div className="eyebrow"><Sparkles size={14} /> Centro de comando</div><h1>Bom dia. Vamos pôr a operação em ordem.</h1><p>As decisões que importam estão reunidas aqui. Sem menus profundos, sem ruído.</p></div><div className="hero-actions"><button className="button ghost" onClick={refresh}><RefreshCw size={16} className={refreshing ? 'spin' : ''} /> Atualizar</button><button className="button primary" onClick={onAdd}><Plus size={17} /> Adicionar pessoa</button></div></section>
    <div className="stat-grid">{stats.map(([label, value, change, trend, Icon]) => <div className="stat-card" key={label}><div className="stat-top"><span>{label}</span><Icon size={17} /></div><div className="stat-value">{value}</div><div className="stat-foot"><strong>{change}</strong><span>{trend}</span></div></div>)}</div>
    <div className="section-heading"><div><h2>Ações instantâneas</h2><span>{approvals.length} itens aguardam decisão</span></div><button className="text-button" onClick={() => onNavigate('leaves')}>Ver fila completa <ArrowRight size={15} /></button></div>
    <div className="two-col">
      <section className="card"><div className="card-header"><div><span className="section-kicker">Aprovações</span><h3>Resolva em 1 clique</h3></div><div className="mini-count">{approvals.length}</div></div><div className="approval-list">{approvals.length ? approvals.map((item) => { const Icon = item.icon; return <div className="approval-item" key={item.id}><div className="approval-icon"><Icon size={17} /></div><div className="approval-copy"><strong>{item.title}</strong><span>{item.type} · {item.meta}</span></div><div className="approval-actions"><button className="icon-button success" aria-label="Aprovar" onClick={() => approve(item)}><Check size={16} /></button><button className="icon-button danger" aria-label="Rejeitar" onClick={() => approve(item)}><X size={16} /></button></div></div>; }) : <EmptyState title="Fila limpa" text="Não há decisões pendentes neste momento." />}</div></section>
      <section className="card"><div className="card-header"><div><span className="section-kicker">Auditoria preditiva</span><h3>O que merece atenção</h3></div><span className="risk-badge"><span /> risco baixo</span></div><div className="anomaly-list">{demoAnomalies.map((item) => <div className="anomaly-item" key={item.title}><div className={`severity ${item.severity}`} /><div><strong>{item.title}</strong><span>{item.detail}</span></div><ArrowRight size={14} className="muted" /></div>)}</div><button className="wide-secondary" onClick={() => onNavigate('audit')}><ShieldCheck size={16} /> Abrir centro de auditoria</button></section>
    </div>
    <section className="card insight-banner"><div className="insight-icon"><Zap size={18} /></div><div><strong>Próximo passo recomendado</strong><span>Complete o onboarding de pessoas e ative a primeira regra de auditoria.</span></div><button className="button subtle" onClick={onAdd}>Começar <ArrowRight size={15} /></button></section>
  </>;
}

function PeoplePage({ employees, onAdd }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => employees.filter((item) => `${item.full_name} ${item.email || ''} ${item.employee_code || ''}`.toLowerCase().includes(query.toLowerCase())), [employees, query]);
  return <><section className="page-hero compact"><div><div className="eyebrow"><Users size={14} /> Pessoas</div><h1>O diretório que o RH usa todos os dias.</h1><p>Pesquisa rápida, ações diretas e contexto no mesmo ecrã.</p></div><button className="button primary" onClick={onAdd}><UserPlus size={17} /> Nova pessoa</button></section><section className="card"><div className="table-toolbar"><div className="search-field"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar por nome, email ou código…" /></div><select defaultValue="ALL"><option value="ALL">Todos os estados</option><option value="ACTIVE">Ativos</option><option value="INACTIVE">Inativos</option></select><button className="button ghost"><Filter size={15} /> Filtros</button></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Pessoa</th><th>Código</th><th>Área</th><th>Estado</th><th>Entrada</th><th /></tr></thead><tbody>{filtered.map((employee) => <tr key={employee.id}><td><div className="person-cell"><div className="avatar avatar-xs">{initials(employee.full_name)}</div><div><strong>{employee.full_name}</strong><span>{employee.email || 'Sem email'}</span></div></div></td><td><code>{employee.employee_code || '—'}</code></td><td>{employee.role || '—'}</td><td><span className={`status-chip ${employee.status === 'ACTIVE' ? 'active' : 'inactive'}`}><span />{employee.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}</span></td><td>{employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('pt-PT') : '—'}</td><td><button className="icon-button"><MoreHorizontal size={18} /></button></td></tr>)}</tbody></table>{!filtered.length && <EmptyState title="Sem resultados" text="A pesquisa não encontrou pessoas." />}</div></section></>;
}

function AttendancePage({ employees }) {
  const times = ['08:56','09:04','08:41','09:16','08:58','09:02'];
  return <><section className="page-hero compact"><div><div className="eyebrow"><Clock3 size={14} /> Ponto & Horários</div><h1>Visão operacional da jornada.</h1><p>Marcação, desvios e fechos num só lugar.</p></div><button className="button ghost"><FileText size={16} /> Exportar espelho</button></section><div className="two-col"><section className="card"><div className="card-header"><div><span className="section-kicker">Hoje</span><h3>Movimento da equipa</h3></div><span className="live-badge"><span /> agora</span></div><div className="attendance-list">{employees.slice(0, 6).map((person, index) => <div className="attendance-row" key={person.id}><div className="person-cell"><div className="avatar avatar-xs">{initials(person.full_name)}</div><div><strong>{person.full_name}</strong><span>{person.role || 'Equipa'}</span></div></div><div className="time"><span>{times[index % times.length]}</span><small>entrada</small></div><div className="time"><span>{index === 2 ? '—' : '17:34'}</span><small>saída</small></div><div>{[0,4,0,16,0,2][index % 6] ? <span className="warning-mini">+{[0,4,0,16,0,2][index % 6]}m</span> : <span className="ok-mini">No horário</span>}</div></div>)}</div></section><section className="card heat-card"><div className="card-header"><div><span className="section-kicker">Conformidade</span><h3>Saúde da jornada</h3></div><Gauge size={18} /></div><div className="score-ring"><strong>94</strong><span>/ 100</span></div><div className="score-copy"><strong>Boa operação</strong><span>O sistema encontrou poucos desvios.</span></div><div className="meter"><span style={{ width: '94%' }} /></div><div className="metric-line"><span>Jornadas completas</span><strong>94,8%</strong></div><div className="metric-line"><span>Saídas em falta</span><strong>2</strong></div><div className="metric-line"><span>Horas extra atípicas</span><strong>1</strong></div></section></div></>;
}

function ApprovalsPage({ notify }) {
  const [items, setItems] = useState(demoApprovals);
  const resolve = (id, approved) => { setItems((current) => current.filter((item) => item.id !== id)); notify(approved ? 'Aprovado com sucesso.' : 'Pedido rejeitado.'); };
  return <><section className="page-hero compact"><div><div className="eyebrow"><CalendarDays size={14} /> Férias & Ausências</div><h1>Aprovação sem atrito.</h1><p>Menos cliques, mais contexto e uma decisão clara.</p></div></section><section className="card"><div className="card-header"><div><span className="section-kicker">Fila de aprovação</span><h3>{items.length} pedidos</h3></div><span className="muted">Ordenados por urgência</span></div><div className="approval-list big">{items.map((item) => { const Icon = item.icon; return <div className="approval-item roomy" key={item.id}><div className="approval-icon"><Icon size={18} /></div><div className="approval-copy"><strong>{item.title}</strong><span>{item.type} · {item.meta}</span></div><button className="button success-button" onClick={() => resolve(item.id, true)}><Check size={15} /> Aprovar</button><button className="button ghost" onClick={() => resolve(item.id, false)}><X size={15} /> Rejeitar</button></div>; })}{!items.length && <EmptyState title="Tudo tratado" text="Nenhum pedido aguarda a sua decisão." />}</div></section></>;
}

function AuditPage() {
  const rules = [['Jornada incompleta', 'Falta de saída, fecho impossível ou sequência inválida.', '2 sinais'], ['Atraso recorrente', 'Concentração de minutos de atraso por pessoa/equipa.', '7 sinais'], ['Horas extra atípicas', 'Picos fora do padrão histórico do período.', '1 sinal'], ['Cobertura de turno', 'Turnos com capacidade abaixo do previsto.', '0 sinais']];
  return <><section className="page-hero compact"><div><div className="eyebrow"><ShieldCheck size={14} /> Auditoria preditiva</div><h1>Encontrar o desvio antes de virar problema.</h1><p>Regras explicáveis, sinais acionáveis e histórico para decisão humana.</p></div><span className="confidence-chip"><CheckCircle2 size={15} /> Motor ativo</span></section><div className="audit-grid"><section className="card score-card"><div className="card-header"><div><span className="section-kicker">Índice operacional</span><h3>Risco atual</h3></div><Activity size={18} /></div><div className="big-score">12<span>/100</span></div><p className="muted">Baixo risco · última leitura há 2 min</p><div className="meter"><span style={{ width: '12%' }} /></div><div className="trend-row"><span>vs. 30 dias</span><strong>−8,2%</strong></div></section><section className="card rules-card"><div className="card-header"><div><span className="section-kicker">Regras</span><h3>Sinais explicados</h3></div><button className="icon-button"><Settings2 size={17} /></button></div><div className="rule-list">{rules.map(([title, detail, count], index) => <div className="rule-item" key={title}><div className="rule-index">0{index + 1}</div><div><strong>{title}</strong><span>{detail}</span></div><em>{count}</em></div>)}</div></section></div><div className="disclaimer"><AlertTriangle size={15} /><span>Os sinais de auditoria apoiam o RH na identificação de desvios. A validação final de conformidade legal continua humana.</span></div></>;
}

function IntegrationsPage() {
  const systems = [['SAP SuccessFactors','SAP','OData / HCM APIs','blue','Colaboradores, centros de custo, rubricas e espelhos.'],['PHC','PHC','REST / SOAP','purple','Sincronização de pessoas, movimentos e estruturas.'],['PRIMAVERA','PR','BSS / Integration Server','green','Dados de recursos humanos e operações.'],['Oracle','OR','Gateway / ORDS','orange','Integração através de gateway protegido.']];
  return <><section className="page-hero compact"><div><div className="eyebrow"><PlugZap size={14} /> Enterprise integrations</div><h1>Conecte o Teconnect ao seu ecossistema.</h1><p>Filas assíncronas, idempotência, reenvio controlado e auditoria de cada integração.</p></div><span className="confidence-chip"><ShieldCheck size={15} /> API-first</span></section><div className="integration-grid">{systems.map(([name, code, mode, tone, desc]) => <div className="integration-card" key={name}><div className={`system-logo ${tone}`}>{code}</div><div className="integration-copy"><strong>{name}</strong><span>{mode}</span><p>{desc}</p></div><div className="integration-state"><CircleDot size={14} /> Pronto para ligar</div><button className="text-button">Configurar <ArrowRight size={15} /></button></div>)}</div><section className="card architecture-card"><div><span className="section-kicker">Motor de sincronização</span><h3>Pipeline de integração</h3></div><div className="pipeline">{['Teconnect','Fila idempotente','Edge Function','ERP / Gateway','Auditoria'].map((label, index) => <div className="pipeline-node" key={label}><div>{index + 1}</div><span>{label}</span>{index < 4 && <ArrowRight size={15} />}</div>)}</div></section></>;
}

function CommandPalette({ onClose, onNavigate, onAdd }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const actions = [
    ['Adicionar colaborador','Criar pessoa',UserPlus,onAdd],
    ['Abrir pessoas','Diretório',Users,() => onNavigate('people')],
    ['Abrir ponto e horários','Operação',Clock3,() => onNavigate('attendance')],
    ['Abrir aprovações','Férias, horas extra e ajustes',CheckCircle2,() => onNavigate('leaves')],
    ['Abrir auditoria','Anomalias e controlo',ShieldCheck,() => onNavigate('audit')],
    ['Abrir integrações','ERP e sincronização',PlugZap,() => onNavigate('integrations')],
  ];
  const filtered = actions.filter(([label, hint]) => `${label} ${hint}`.toLowerCase().includes(query.toLowerCase()));
  useEffect(() => inputRef.current?.focus(), []);
  return <div className="overlay" onMouseDown={onClose}><div className="palette" onMouseDown={(event) => event.stopPropagation()}><div className="palette-search"><Search size={18} /><input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="O que precisa de fazer?" /><kbd>ESC</kbd></div><div className="palette-section"><span>Ações rápidas</span></div><div className="palette-list">{filtered.map(([label, hint, Icon, run]) => <button className="palette-item" key={label} onClick={() => { run(); onClose(); }}><span className="palette-icon"><Icon size={17} /></span><div><strong>{label}</strong><span>{hint}</span></div><ChevronRight size={16} className="muted" /></button>)}</div>{!filtered.length && <div className="palette-empty"><Command size={22} /><strong>Nenhum comando encontrado</strong><span>Tente “colaborador”, “ponto” ou “auditoria”.</span></div>}<div className="palette-footer"><span>Atalhos de teclado</span><span>↵ selecionar</span></div></div></div>;
}

function EmployeeDrawer({ onClose, companyId, onCreated, notify }) {
  const [form, setForm] = useState({ full_name: '', employee_code: '', email: '', hire_date: '' });
  const [saving, setSaving] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    if (!form.full_name.trim() || !form.employee_code.trim()) { notify('Nome e código são obrigatórios.', 'error'); return; }
    setSaving(true);
    try {
      if (!supabase || !companyId) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        await onCreated({ id: `demo-${Date.now()}`, ...form, status: 'ACTIVE', role: 'Nova equipa' });
        return;
      }
      const { data, error } = await supabase.rpc('create_employee_app', {
        p_employee_code: form.employee_code.trim(), p_full_name: form.full_name.trim(),
        p_email: form.email.trim() || null, p_phone: null, p_nif: null, p_hire_date: form.hire_date || null,
      });
      if (error) throw error;
      const created = Array.isArray(data) ? data[0] : data;
      await onCreated(created || { id: crypto.randomUUID(), ...form, status: 'ACTIVE', role: 'Nova equipa' });
    } catch (error) {
      console.error(error);
      notify(error?.message || 'Não foi possível criar a pessoa.', 'error');
    } finally { setSaving(false); }
  };
  return <div className="overlay drawer-overlay" onMouseDown={onClose}><aside className="drawer" onMouseDown={(event) => event.stopPropagation()}><div className="drawer-head"><div><span className="section-kicker">Onboarding rápido</span><h3>Nova pessoa</h3><p>Quatro campos. Menos de 30 segundos.</p></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div><div className="progress"><span style={{ width: '34%' }} /></div><form onSubmit={submit} className="drawer-form"><label><span>Nome completo</span><input autoFocus value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Ex.: Ana Ferreira" /></label><label><span>Código interno</span><input value={form.employee_code} onChange={(e) => setForm({ ...form, employee_code: e.target.value })} placeholder="Ex.: TC-014" /></label><label><span>Email</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ana@empresa.pt" /></label><label><span>Data de entrada</span><input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} /></label><div className="drawer-note"><Sparkles size={15} /><span>O restante perfil pode ser completado depois. O RH não precisa de interromper o fluxo.</span></div><div className="drawer-actions"><button type="button" className="button ghost" onClick={onClose}>Cancelar</button><button disabled={saving} className="button primary" type="submit">{saving ? 'A guardar…' : 'Criar pessoa'} <ArrowRight size={15} /></button></div></form></aside></div>;
}

function EmptyState({ title, text }) { return <div className="empty-state"><div className="empty-icon"><CheckCircle2 size={19} /></div><strong>{title}</strong><span>{text}</span></div>; }

export default App;
