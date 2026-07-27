import React from 'react';
import {
  Activity,
  ArrowRight,
  AudioWaveform,
  Baby,
  BatteryFull,
  Bell,
  Brain,
  Briefcase,
  Calendar,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronLeft,
  Cigarette,
  ChevronRight,
  Clock,
  Droplet,
  Eye,
  FileText,
  FlaskConical,
  GitCommitHorizontal,
  HeartPulse,
  History,
  Info,
  Languages,
  LayoutGrid,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Plus,
  RotateCcw,
  Ruler,
  Scale,
  Settings,
  Shield,
  ShieldCheck,
  Signal,
  Share,
  SquarePlus,
  Stethoscope,
  Syringe,
  TrendingUp,
  Upload,
  User,
  Users,
  Wifi,
  X,
} from 'lucide-react';

// Explicit, tree-shakeable icon registry (matches the Lucide names the Vitalis
// design system and this app's screens actually reference). `import * as` from
// 'lucide-react' would pull the whole icon set into the bundle — add new icons
// here by name as new screens need them, not by widening the import.
const ICONS_BY_NAME = Object.freeze({
  'layout-grid': LayoutGrid,
  syringe: Syringe,
  'shield-check': ShieldCheck,
  brain: Brain,
  calendar: Calendar,
  lock: Lock,
  history: History,
  user: User,
  bell: Bell,
  signal: Signal,
  wifi: Wifi,
  'battery-full': BatteryFull,
  'arrow-right': ArrowRight,
  'audio-waveform': AudioWaveform,
  check: Check,
  plus: Plus,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  droplet: Droplet,
  stethoscope: Stethoscope,
  'file-text': FileText,
  upload: Upload,
  'heart-pulse': HeartPulse,
  activity: Activity,
  eye: Eye,
  info: Info,
  'map-pin': MapPin,
  mail: Mail,
  x: X,
  ruler: Ruler,
  scale: Scale,
  cigarette: Cigarette,
  baby: Baby,
  briefcase: Briefcase,
  'flask-conical': FlaskConical,
  share: Share,
  'square-plus': SquarePlus,
  'calendar-plus': CalendarPlus,
  'check-circle-2': CheckCircle2,
  clock: Clock,
  'git-commit-horizontal': GitCommitHorizontal,
  languages: Languages,
  'log-out': LogOut,
  'rotate-ccw': RotateCcw,
  settings: Settings,
  shield: Shield,
  'trending-up': TrendingUp,
  users: Users,
});

export function Icon({ name, size = 20, strokeWidth = 1.75, color = 'currentColor', style, className, ...rest }) {
  const LucideIcon = ICONS_BY_NAME[name];

  if (!LucideIcon) {
    return null;
  }

  return (
    <LucideIcon
      size={size}
      strokeWidth={strokeWidth}
      color={color}
      className={className}
      style={style}
      {...rest}
    />
  );
}
