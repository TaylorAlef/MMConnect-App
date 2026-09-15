export const PLAN_ORDER = { STARTER: 1, BUSINESS: 2, ENTERPRISE: 3 };

export const FEATURE_RULES = {
  erp: { minimumPlan: 'BUSINESS', label: 'Integrações ERP', description: 'SAP, PHC, Primavera e Oracle em background.' },
  advanced_shifts: { minimumPlan: 'BUSINESS', label: 'Turnos avançados', description: 'Rotações, jornadas noturnas e regras avançadas.' },
  predictive_alerts: { minimumPlan: 'STARTER', label: 'Alertas preditivos', description: 'Deteção automática de risco operacional.' },
  tasks: { minimumPlan: 'STARTER', label: 'Tarefas RH', description: 'Fluxo operacional e auditoria de tarefas.' },
  sso: { minimumPlan: 'ENTERPRISE', label: 'SSO corporativo', description: 'Autenticação empresarial e controlo avançado.' },
};

export function hasPlanAccess(planCode, feature) {
  const rule = FEATURE_RULES[feature];
  if (!rule) return false;
  return PLAN_ORDER[String(planCode || '').toUpperCase()] >= PLAN_ORDER[rule.minimumPlan];
}

export function featureLabel(feature) { return FEATURE_RULES[feature]?.label || feature; }
export function featureMinimumPlan(feature) { return FEATURE_RULES[feature]?.minimumPlan || 'BUSINESS'; }
