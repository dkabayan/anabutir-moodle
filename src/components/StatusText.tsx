import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  KeyRound,
  MinusCircle,
  XCircle,
} from 'lucide-react';
import {
  DifficultyLevel,
  DiscriminationLevel,
  DistractorStatus,
  ItemDecision,
} from '../types/analysis';

export function DecisionIndicator({ decision }: { decision: ItemDecision }) {
  if (decision === 'Diterima') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Diterima</span>
      </span>
    );
  }
  if (decision === 'Revisi') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Revisi</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap">
      <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>Dibuang</span>
    </span>
  );
}

export function DifficultyIndicator({ level }: { level: DifficultyLevel }) {
  const colorClass =
    level === 'Sedang'
      ? 'text-slate-700'
      : level === 'Mudah'
      ? 'text-blue-700'
      : 'text-amber-700';

  return <span className={`text-xs font-medium whitespace-nowrap ${colorClass}`}>{level}</span>;
}

export function DiscriminationIndicator({ level }: { level: DiscriminationLevel }) {
  const colorClass =
    level === 'Sangat Baik' || level === 'Baik'
      ? 'text-emerald-700'
      : level === 'Cukup'
      ? 'text-amber-700'
      : 'text-red-700';

  return <span className={`text-xs font-medium whitespace-nowrap ${colorClass}`}>{level}</span>;
}

export function DistractorStatusIndicator({ status }: { status: DistractorStatus }) {
  if (status === 'Kunci Jawaban') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 whitespace-nowrap">
        <KeyRound className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Kunci Jawaban</span>
      </span>
    );
  }
  if (status === 'Berfungsi') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Berfungsi</span>
      </span>
    );
  }
  if (status === 'Menjebak') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Menjebak</span>
      </span>
    );
  }
  if (status === 'Tidak Berfungsi') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
        <MinusCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Tidak Berfungsi</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
      <CircleSlash className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>Tidak Menjawab</span>
    </span>
  );
}
