import { LockKeyhole, Sparkles } from 'lucide-react';
import { hasPlanAccess, featureLabel, featureMinimumPlan } from './featureFlags';

export default function FeatureGate({ planCode, feature, children, onUpgrade }) {
  if (hasPlanAccess(planCode, feature)) return children;
  const label = featureLabel(feature); const minimum = featureMinimumPlan(feature);
  return <div className="tc-feature-locked"><div className="tc-feature-locked-icon"><LockKeyhole size={18}/></div><div><strong>{label}</strong><span>Disponível a partir do plano {minimum === 'BUSINESS' ? 'Business' : 'Enterprise'}.</span></div><button className="tc-btn ghost" onClick={onUpgrade}><Sparkles size={15}/> Upgrade</button></div>;
}
