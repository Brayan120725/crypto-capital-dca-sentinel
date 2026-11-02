import React from 'react';
import { ArrowDownRight, ShieldAlert, Activity } from 'lucide-react';
import { DecisionState } from '../types';

interface DecisionBadgeProps {
  state: DecisionState;
  size?: 'sm' | 'md' | 'lg';
  sublabel?: string;
}

export const DecisionBadge: React.FC<DecisionBadgeProps> = ({
  state,
  size = 'md',
  sublabel,
}) => {
  const config = {
    'Comprar Dip': {
      bg: 'bg-[#10b981]/10',
      border: 'border-[#10b981]/40',
      text: 'text-[#10b981]',
      dot: 'bg-[#10b981]',
      code: 'SIG::BUY_DIP',
      Icon: ArrowDownRight,
    },
    'Acumular USDT': {
      bg: 'bg-[#f43f5e]/10',
      border: 'border-[#f43f5e]/40',
      text: 'text-[#f43f5e]',
      dot: 'bg-[#f43f5e]',
      code: 'SIG::OVERHEAT_HOLD_USDT',
      Icon: ShieldAlert,
    },
    Neutral: {
      bg: 'bg-[#18181b]',
      border: 'border-[#27272a]',
      text: 'text-zinc-300',
      dot: 'bg-[#eab308]',
      code: 'SIG::RANGE_NEUTRAL',
      Icon: Activity,
    },
  }[state];

  const { Icon } = config;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] gap-1.5',
    md: 'px-2.5 py-1 text-xs gap-2',
    lg: 'px-3.5 py-1.5 text-xs gap-2.5',
  }[size];

  return (
    <div
      className={`inline-flex items-center rounded-md border font-mono uppercase tracking-wider ${config.bg} ${config.border} ${config.text} ${sizeClasses}`}
      data-testid="decision-badge"
    >
      <span className={`h-1.5 w-1.5 rounded-sm ${config.dot}`} />
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="font-semibold">{state}</span>
      {sublabel && (
        <span className="border-l border-current/25 pl-2 text-[10px] opacity-80">
          {sublabel}
        </span>
      )}
    </div>
  );
};
