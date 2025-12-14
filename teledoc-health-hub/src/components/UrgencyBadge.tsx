import { Badge } from './ui/badge';
import { AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';

interface UrgencyBadgeProps {
  urgency: string;
}

export function UrgencyBadge({ urgency }: UrgencyBadgeProps) {
  const config: Record<string, { label: string; icon: any; className: string }> = {
    emergency: {
      label: 'Emergency',
      icon: AlertTriangle,
      className: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    },
    critical: {
      label: 'Critical',
      icon: AlertCircle,
      className: 'bg-orange-500 text-white hover:bg-orange-600',
    },
    urgent: {
      label: 'Urgent',
      icon: AlertCircle,
      className: 'bg-orange-500 text-white hover:bg-orange-600',
    },
    high: {
      label: 'High',
      icon: AlertCircle,
      className: 'bg-orange-500 text-white hover:bg-orange-600',
    },
    routine: {
      label: 'Routine',
      icon: CheckCircle,
      className: 'bg-green-500 text-white hover:bg-green-600',
    },
    normal: {
      label: 'Normal',
      icon: CheckCircle,
      className: 'bg-green-500 text-white hover:bg-green-600',
    },
    low: {
      label: 'Low',
      icon: CheckCircle,
      className: 'bg-green-500 text-white hover:bg-green-600',
    },
  };

  const normalizedUrgency = (urgency?.toLowerCase()) || 'routine';
  const { label, icon: Icon, className } = config[normalizedUrgency] || config.routine;

  return (
    <Badge className={className}>
      <Icon className="mr-1 h-3 w-3" />
      {label}
    </Badge>
  );
}
