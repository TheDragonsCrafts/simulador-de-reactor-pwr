import {
  Activity,
  AlertTriangle,
  BookOpenText,
  Factory,
  Flame,
  Gauge,
  Orbit,
  Radio,
  RefreshCw,
  Shield,
  Siren,
  Waves,
  Wind,
  Wrench,
  X,
  Zap,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

import {
  buildDetectors,
  computeExportPrice,
  computeRevenuePerMinute,
  computeRiskIndex,
  formatCurrency,
  formatRadiation,
  getCoolantProfile,
  isCleanPlant,
  CLEAN_PLANT_BONUS,
  SHIELD_COST_PER_TICK,
  type AlertItem,
  type AlertSeverity,
  type FissionState,
  type GuideTopic,
  type LogLevel,
  type NoticeTone,
  type SimulationState,
  type UpgradesState,
} from '../sim';
import type { NoticeItem } from '../useSimulation';

interface MetricBarProps {
  label: string;
  valueLabel: string;
  value: number;
  fillClassName: string;
  trackClassName?: string;
}

interface TrendCardProps {
  title: string;
  icon: LucideIcon;
  values: number[];
  value: string;
  subtitle: string;
  stroke: string;
  fill: string;
  accentClassName: string;
}

interface SystemRowProps {
  title: string;
  icon: LucideIcon;
  value: string;
  status: string;
  toneClassName: string;
}

interface HeaderStatProps {
  label: string;
  value: string;
  toneClassName: string;
}

interface NoticeRailProps {
  notices: NoticeItem[];
  dismissNotice: (id: number) => void;
}

interface GuideDrawerProps {
  open: boolean;
  topics: GuideTopic[];
  activeGuideId: string;
  onSelectTopic: (id: string) => void;
  onClose: () => void;
  sim: SimulationState;
  maintenanceWindow: boolean;
}

interface MonitorSidebarProps {
  sim: SimulationState;
  alerts: AlertItem[];
  recommendations: string[];
  maintenanceWindow: boolean;
  onBuyUpgrade: (upgradeId: keyof UpgradesState) => void;
}

interface GameOverModalProps {
  sim: SimulationState;
  open: boolean;
  onRestart: () => void;
}

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const getStatusColorClass = (
  value: number,
  warning: number,
  danger: number,
  inverse = false,
) => {
  if (inverse) {
    if (value <= danger) return 'text-rose-300';
    if (value <= warning) return 'text-amber-300';
    return 'text-emerald-300';
  }

  if (value >= danger) return 'text-rose-300';
  if (value >= warning) return 'text-amber-300';
  return 'text-emerald-300';
};

export const getFissionToneClass = (state: FissionState) => {
  switch (state) {
    case 'Fusion':
      return 'border-rose-500/40 bg-rose-500/10 text-rose-200';
    case 'Transitorio severo':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
    case 'Potencia alta':
    case 'Carga media':
      return 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200';
    case 'SCRAM':
      return 'border-orange-500/40 bg-orange-500/10 text-orange-200';
    default:
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
  }
};

export const getSeverityClasses = (severity: AlertSeverity) => {
  switch (severity) {
    case 'critical':
      return 'border-rose-500/35 bg-rose-500/12 text-rose-100';
    case 'danger':
      return 'border-orange-500/35 bg-orange-500/12 text-orange-100';
    default:
      return 'border-amber-500/35 bg-amber-500/12 text-amber-100';
  }
};

export const getDetectorTone = (value: number) => {
  if (value >= 40) {
    return {
      badge: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
      bar: 'bg-rose-400',
      label: 'ALARMA',
    };
  }
  if (value >= 18) {
    return {
      badge: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
      bar: 'bg-amber-400',
      label: 'VIGILAR',
    };
  }
  return {
    badge: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
    bar: 'bg-emerald-400',
    label: 'NORMAL',
  };
};

const noticeToneClasses: Record<NoticeTone, string> = {
  info: 'border-cyan-500/35 bg-cyan-500/10 text-cyan-50',
  success: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-50',
  warning: 'border-amber-500/35 bg-amber-500/10 text-amber-50',
  danger: 'border-rose-500/35 bg-rose-500/10 text-rose-50',
};

const logColors: Record<LogLevel, string> = {
  INFO: 'text-slate-300',
  WARN: 'text-amber-300',
  DANGER: 'text-orange-300',
  CRITICAL: 'text-rose-300 font-semibold',
};

const logBorderColors: Record<LogLevel, string> = {
  INFO: 'border-l-slate-500',
  WARN: 'border-l-amber-400',
  DANGER: 'border-l-orange-400',
  CRITICAL: 'border-l-rose-400',
};

const inferLogSubsystem = (message: string) => {
  const normalized = message.toLowerCase();

  if (
    normalized.includes('diagnóstico final') ||
    normalized.includes('qué salió mal')
  ) {
    return 'Fallo';
  }

  if (
    normalized.includes('purga') ||
    normalized.includes('contención') ||
    normalized.includes('radiación')
  ) {
    return 'Contención';
  }
  if (
    normalized.includes('bomba') ||
    normalized.includes('refrigerante') ||
    normalized.includes('química')
  ) {
    return 'Primario';
  }
  if (
    normalized.includes('turbina') ||
    normalized.includes('secundaria') ||
    normalized.includes('potencia eléctrica')
  ) {
    return 'Turbina';
  }
  if (
    normalized.includes('fisión') ||
    normalized.includes('núcleo') ||
    normalized.includes('combustible') ||
    normalized.includes('xenón')
  ) {
    return 'Núcleo';
  }

  return 'Planta';
};

export function MetricBar({
  label,
  valueLabel,
  value,
  fillClassName,
  trackClassName = 'bg-slate-800/80',
}: MetricBarProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-slate-400">
        <span>{label}</span>
        <span>{valueLabel}</span>
      </div>
      <div className={`h-2.5 overflow-hidden rounded-full ${trackClassName}`}>
        <div
          className={`h-full rounded-full transition-all duration-700 ${fillClassName}`}
          style={{ width: `${clamp(value, 0, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function TrendCard({
  title,
  icon: Icon,
  values,
  value,
  subtitle,
  stroke,
  fill,
  accentClassName,
}: TrendCardProps) {
  const width = 260;
  const height = 118;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const delta = values[values.length - 1] - values[0];
  const deltaLabel = `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`;

  const coordinates = values.map((point, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * width;
    const y = height - ((point - min) / range) * (height - 18) - 9;
    return `${x},${y}`;
  });

  const path = `M ${coordinates.join(' L ')}`;
  const areaPath = `${path} L ${width},${height} L 0,${height} Z`;

  return (
    <div className="panel-glass min-w-0 overflow-hidden rounded-[28px] border border-slate-800/80 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-slate-500">
            <Icon className="h-4 w-4 text-cyan-300" />
            {title}
          </div>
          <div className={`mt-2 text-2xl font-semibold ${accentClassName}`}>
            {value}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800/70 bg-slate-950/80 px-3 py-2 text-right">
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
            {subtitle}
          </div>
          <div className="mt-1 text-sm font-medium text-slate-200">{deltaLabel}</div>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-32 w-full overflow-visible">
        <defs>
          <linearGradient id={`${title}-gradient`} x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor={fill} stopOpacity="0.48" />
            <stop offset="100%" stopColor={fill} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[22, 50, 78, 106].map((line) => (
          <line
            key={line}
            x1="0"
            x2={width}
            y1={line}
            y2={line}
            stroke="rgba(100,116,139,0.18)"
            strokeDasharray="4 8"
          />
        ))}
        <path d={areaPath} fill={`url(#${title}-gradient)`} />
        <path
          d={path}
          fill="none"
          stroke={stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="mt-4 flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-slate-500">
        <span>mín {min.toFixed(1)}</span>
        <span>máx {max.toFixed(1)}</span>
      </div>
    </div>
  );
}

export function SystemRow({
  title,
  icon: Icon,
  value,
  status,
  toneClassName,
}: SystemRowProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-800/70 bg-slate-950/60 px-3 py-3 sm:px-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <div className="min-w-0 flex-1 flex items-center gap-3">
        <div className="shrink-0 rounded-xl border border-slate-800 bg-slate-900/80 p-2">
          <Icon className="h-4 w-4 text-cyan-300" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500 truncate">
            {title}
          </div>
          <div className="mt-1 truncate text-sm font-medium text-slate-200">
            {value}
          </div>
        </div>
      </div>
      <span
        className={`self-start shrink-0 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.24em] sm:self-auto ${toneClassName}`}
      >
        {status}
      </span>
    </div>
  );
}

export function HeaderStat({ label, value, toneClassName }: HeaderStatProps) {
  return (
    <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
        {label}
      </div>
      <div className={`mt-2 text-lg font-semibold ${toneClassName}`}>{value}</div>
    </div>
  );
}

export function NoticeRail({ notices, dismissNotice }: NoticeRailProps) {
  if (notices.length === 0) return null;

  return (
    <section className="grid gap-3 lg:grid-cols-2">
      {notices.map((notice) => (
        <div
          key={notice.id}
          className={`panel-glass rounded-[26px] border p-4 ${noticeToneClasses[notice.tone]}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.26em] text-slate-300/80">
                aviso operativo
              </div>
              <div className="mt-1 text-sm font-semibold">{notice.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-slate-200/90">
                {notice.detail}
              </p>
            </div>
            <button
              onClick={() => dismissNotice(notice.id)}
              className="rounded-xl border border-white/10 bg-slate-950/35 p-2 text-slate-100 transition hover:bg-slate-900/50"
              aria-label="Descartar aviso"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}

export function GuideDrawer({
  open,
  topics,
  activeGuideId,
  onSelectTopic,
  onClose,
  sim,
  maintenanceWindow,
}: GuideDrawerProps) {
  if (!open) return null;

  const activeGuide = topics.find((topic) => topic.id === activeGuideId) ?? topics[0];
  const maxDetector = Math.max(...buildDetectors(sim).map((detector) => detector.value));
  const coolantProfile = getCoolantProfile(sim.coolantProfile);

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/75 backdrop-blur-sm">
      <div className="absolute inset-y-0 right-0 h-full w-full max-w-4xl overflow-hidden border-l border-slate-800/80 bg-slate-950/94 shadow-[-30px_0_80px_rgba(2,6,23,0.65)]">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4 md:px-6">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-slate-500">
                Guía del operador
              </div>
              <div className="mt-1 text-xl font-semibold text-slate-100">
                Explicación de sistemas y maniobras
              </div>
            </div>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/80 p-2 text-slate-300 transition hover:border-slate-700 hover:bg-slate-800/80"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="overflow-y-auto border-b border-slate-800/70 p-4 md:border-b-0 md:border-r">
              <div className="space-y-2">
                {topics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => onSelectTopic(topic.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      activeGuideId === topic.id
                        ? 'border-cyan-500/35 bg-cyan-500/10 text-cyan-100'
                        : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-500">
                      {topic.title}
                    </div>
                    <div className="mt-1 text-sm leading-relaxed">{topic.summary}</div>
                  </button>
                ))}
              </div>
            </aside>

            <div className="min-w-0 overflow-y-auto p-5 md:p-6">
              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/50 p-5">
                <div className="flex flex-col gap-4 border-b border-slate-800/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.28em] text-slate-500">
                      Tema seleccionado
                    </div>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-50">
                      {activeGuide.title}
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
                      {activeGuide.summary}
                    </p>
                  </div>
                  <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-cyan-200">
                    panel interactivo
                  </span>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {[
                    ['Cómo funciona', activeGuide.howItWorks],
                    ['Qué lo empeora', activeGuide.whatRaisesIt],
                    ['Qué lo corrige', activeGuide.whatLowersIt],
                    ['Cómo operarlo bien', activeGuide.operatorChecklist],
                  ].map(([title, items]) => (
                    <div
                      key={title}
                      className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4"
                    >
                      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                        {title}
                      </div>
                      <div className="mt-3 space-y-3">
                        {(items as string[]).map((item) => (
                          <div key={item} className="flex gap-3 text-sm text-slate-300">
                            <span className="mt-1 h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.7)]" />
                            <p className="leading-relaxed">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    Por qué importa
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">
                    {activeGuide.whyItMatters}
                  </p>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                      Lectura actual
                    </div>
                    <div className="mt-2 text-lg font-semibold text-slate-100">
                      {activeGuideId === 'fission' &&
                        `${sim.fissionState} / ${sim.thermalPower.toFixed(0)} MWt`}
                      {activeGuideId === 'rods' &&
                        `Objetivo ${sim.controlRodsTarget.toFixed(0)}% / Real ${sim.controlRods.toFixed(0)}%`}
                      {activeGuideId === 'cooling' &&
                        `P1 ${sim.primaryPumpFlow.toFixed(0)}% / P2 ${sim.secondaryPumpFlow.toFixed(0)}%`}
                      {activeGuideId === 'chemistry' &&
                        `Blend ${coolantProfile.shortLabel} / Química auto ${sim.chemistryBalance.toFixed(1)}%`}
                      {activeGuideId === 'radiation' &&
                        `${formatRadiation(sim.radiationLevel)} / Pico ${formatRadiation(maxDetector)}`}
                      {activeGuideId === 'turbine' &&
                        `${sim.powerOutput.toFixed(1)} MW / ${sim.turbineEfficiency.toFixed(1)}% eficiencia`}
                      {activeGuideId === 'shields' &&
                        `${sim.radiationShields.filter(Boolean).length}/4 activos / Ef. media ${(
                          sim.shieldEfficiency.reduce((s, e, i) => sim.radiationShields[i] ? s + e : s, 0) /
                          Math.max(sim.radiationShields.filter(Boolean).length, 1)
                        ).toFixed(0)}%`}
                      {activeGuideId === 'maintenance' &&
                        `${maintenanceWindow ? 'Ventana disponible' : 'Ventana bloqueada'}`}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                      Consejo rápido
                    </div>
                    <div className="mt-2 text-sm leading-relaxed text-slate-300">
                      {activeGuideId === 'fission' &&
                        'No persigas la temperatura tick a tick: mira tendencia, potencia térmica y calor residual.'}
                      {activeGuideId === 'rods' &&
                        'Si exiges un cambio grande, espera unos segundos para evaluar la respuesta del núcleo antes de corregir otra vez.'}
                      {activeGuideId === 'cooling' &&
                        'Las bombas no entregan 100% de caudal al instante; usa el monitor de caudal real para decidir.'}
                      {activeGuideId === 'chemistry' &&
                        'El circuito ya se mantiene solo; la jugada está en el blend del refrigerante y en guardar el boro para transitorios serios.'}
                      {activeGuideId === 'overclock' &&
                        'Prepara la planta antes del pulso: caudal nominal alto y presión todavía en banda.'}
                      {activeGuideId === 'radiation' &&
                        'Observa si sube una sola zona o todas: eso distingue un transitorio local de un problema global.'}
                      {activeGuideId === 'turbine' &&
                        'Si el rotor se ve rápido pero la carga no sube, el problema casi siempre es eficiencia o pérdida de vapor útil.'}
                      {activeGuideId === 'shields' &&
                        'No dejes todos los escudos siempre encendidos — elige las zonas que más lo necesitan y combina con spray y Shield-X para maximizar el bonus de planta limpia.'}
                      {activeGuideId === 'maintenance' &&
                        'Si fuerzas potencia con equipos degradados, cada maniobra futura se vuelve más lenta y más cara.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MonitorSidebar({
  sim,
  alerts,
  recommendations,
  maintenanceWindow,
  onBuyUpgrade,
}: MonitorSidebarProps) {
  const riskIndex = computeRiskIndex(sim);
  const coolantProfile = getCoolantProfile(sim.coolantProfile);
  const exposedCoreRatio = clamp((100 - sim.coolantLevel) / 100, 0, 1);
  const breachRatio = clamp((100 - sim.containmentIntegrity) / 100, 0, 1);
  const criticalAlerts = alerts.filter((alert) => alert.severity === 'critical').length;
  const dangerAlerts = alerts.filter((alert) => alert.severity === 'danger').length;
  const warningAlerts = alerts.filter((alert) => alert.severity === 'warning').length;
  const releaseRate = clamp(
    (sim.purgeValveOpen ? 38 : 0) +
      Math.max(0, sim.pressure - 16) * 9 +
      breachRatio * 46 +
      exposedCoreRatio * 12 +
      sim.coreDamage * 0.24,
    0,
    100,
  );

  return (
    <aside className="space-y-6">
      <div className="panel-glass rounded-[30px] border border-slate-800/80 p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-slate-400">
              <Siren className="h-4 w-4 text-cyan-300" />
              Monitor del sistema
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Riesgo compuesto, subsistemas y margen operativo.
            </p>
          </div>
          <div className="status-ring flex h-20 w-20 items-center justify-center rounded-full border border-slate-800/70 bg-slate-950/70">
            <div className="text-center">
              <div
                className={`text-2xl font-semibold ${getStatusColorClass(riskIndex, 45, 75)}`}
              >
                {riskIndex.toFixed(0)}
              </div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                riesgo
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <SystemRow
            title="Núcleo"
            icon={Flame}
            value={`${sim.coreTemp.toFixed(1)} C / ${sim.thermalPower.toFixed(0)} MWt / daño ${sim.coreDamage.toFixed(0)}%`}
            status={
              sim.coreDamage > 70
                ? 'dañado'
                : sim.coreTemp > 800
                  ? 'límite'
                  : sim.coreTemp > 350
                    ? 'vigilar'
                    : 'estable'
            }
            toneClassName={
              sim.coreDamage > 70 || sim.coreTemp > 800
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                : sim.coreTemp > 350
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                  : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
            }
          />
          <SystemRow
            title="Refrigeración"
            icon={Waves}
            value={`auto ${sim.coolantLevel.toFixed(0)}% / ${coolantProfile.shortLabel} / P1 ${sim.primaryPumpFlow.toFixed(0)}%`}
            status={sim.primaryPumpDemand > 100 ? 'boost' : 'automática'}
            toneClassName={
              sim.primaryPumpDemand > 100
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
            }
          />
          <SystemRow
            title="Contención"
            icon={Shield}
            value={`${sim.containmentIntegrity.toFixed(1)}% / ${formatRadiation(sim.radiationLevel)}`}
            status={
              sim.containmentIntegrity < 65
                ? 'exigida'
                : sim.radiationLevel > 45
                  ? 'alerta'
                  : 'cerrada'
            }
            toneClassName={
              sim.containmentIntegrity < 65
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                : sim.radiationLevel > 45
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                  : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
            }
          />
          <SystemRow
            title="Turbogenerador"
            icon={Zap}
            value={`${sim.turbineEfficiency.toFixed(1)}% / ${sim.powerOutput.toFixed(1)} MW / residual ${sim.decayHeat.toFixed(0)} MWt`}
            status={sim.turbineEfficiency < 60 ? 'desgastado' : 'productivo'}
            toneClassName={
              sim.turbineEfficiency < 60
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
            }
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/8 p-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
              críticas
            </div>
            <div className="mt-2 text-xl font-semibold text-rose-300">
              {criticalAlerts}
            </div>
          </div>
          <div className="rounded-2xl border border-orange-500/20 bg-orange-500/8 p-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
              severas
            </div>
            <div className="mt-2 text-xl font-semibold text-orange-300">
              {dangerAlerts}
            </div>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/8 p-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
              vigilar
            </div>
            <div className="mt-2 text-xl font-semibold text-amber-300">
              {warningAlerts}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-500">
              <Wind className="h-4 w-4 text-amber-300" />
              Purga
            </div>
            <div
              className={`mt-2 text-lg font-semibold ${
                sim.purgeValveOpen ? 'text-amber-300' : 'text-slate-200'
              }`}
            >
              {sim.purgeValveOpen ? 'ABIERTA' : 'CERRADA'}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {sim.purgeValveOpen ? `${sim.purgeOpenSeconds}s abierta` : 'sin alivio activo'}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-500">
              <Shield className="h-4 w-4 text-cyan-300" />
              Spray
            </div>
            <div
              className={`mt-2 text-lg font-semibold ${
                sim.containmentSprayActive ? 'text-cyan-300' : 'text-slate-200'
              }`}
            >
              {sim.containmentSprayActive ? 'ACTIVO' : 'INACTIVO'}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              reserva {sim.sprayReserve.toFixed(0)}% / {sim.sprayActiveSeconds}s activo
            </div>
          </div>
        </div>

        {/* Shield Status */}
        <div className="mt-5 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
              <Shield className="h-4 w-4 text-cyan-300" />
              Blindaje activo
            </div>
            <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
              {sim.radiationShields.filter(Boolean).length}/4 zonas
            </span>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {['A', 'B', 'C', 'D'].map((label, i) => (
              <div key={label} className="text-center">
                <div className={`mx-auto h-3 w-3 rounded-full transition-all duration-300 ${
                  sim.radiationShields[i]
                    ? sim.shieldEfficiency[i] > 50
                      ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]'
                      : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]'
                    : 'bg-slate-700'
                }`} />
                <div className="mt-1 text-[9px] uppercase text-slate-500">{label}</div>
                <div className={`text-[10px] font-semibold ${
                  sim.radiationShields[i] ? 'text-cyan-300' : 'text-slate-600'
                }`}>
                  {sim.radiationShields[i] ? `${sim.shieldEfficiency[i].toFixed(0)}%` : 'OFF'}
                </div>
              </div>
            ))}
          </div>
          {sim.radiationShields.filter(Boolean).length > 0 && (
            <div className="mt-2 text-[10px] uppercase tracking-[0.22em] text-amber-300/80">
              costo: -${(sim.radiationShields.filter(Boolean).length * SHIELD_COST_PER_TICK).toLocaleString('es-MX')}/s
            </div>
          )}
          {(() => {
            const dets = buildDetectors(sim);
            return isCleanPlant(dets) ? (
              <div className="mt-2 text-[10px] uppercase tracking-[0.22em] text-emerald-400">
                ✦ planta limpia: +${CLEAN_PLANT_BONUS}/MWh
              </div>
            ) : null;
          })()}
        </div>

        <div className="mt-5 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
          <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
            Liberación y fugas
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <MetricBar
              label="Alivio"
              valueLabel={`${releaseRate.toFixed(0)}%`}
              value={releaseRate}
              fillClassName="bg-gradient-to-r from-cyan-300 via-sky-300 to-white"
            />
            <MetricBar
              label="Fuga"
              valueLabel={`${(breachRatio * 100).toFixed(0)}%`}
              value={breachRatio * 100}
              fillClassName="bg-gradient-to-r from-rose-300 via-orange-300 to-cyan-300"
            />
            <MetricBar
              label="Exposición"
              valueLabel={`${(exposedCoreRatio * 100).toFixed(0)}%`}
              value={exposedCoreRatio * 100}
              fillClassName="bg-gradient-to-r from-orange-400 via-rose-400 to-red-500"
            />
          </div>
        </div>
      </div>

      <div className="panel-glass rounded-[30px] border border-slate-800/80 p-5">
        <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-slate-400">
          <AlertTriangle className="h-4 w-4 text-cyan-300" />
          Alarmas y recomendaciones
        </div>

        <div className="space-y-4">
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Alarmas activas
            </div>
            <div className="space-y-3">
              {alerts.length > 0 ? (
                alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className={`rounded-2xl border p-4 ${getSeverityClasses(alert.severity)}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold">{alert.title}</div>
                      <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-slate-200/80">
                        {alert.area}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-200/90">
                      {alert.detail}
                    </p>
                  </div>
                ))
              ) : (
                <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-emerald-200">
                  Sin alarmas activas
                </span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
            <div className="mb-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Acciones recomendadas
            </div>
            <div className="space-y-3">
              {recommendations.map((recommendation) => (
                <div key={recommendation} className="flex gap-3 text-sm text-slate-300">
                  <span className="mt-1 h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.75)]" />
                  <span>{recommendation}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
            <div className="mb-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Ventana de mantenimiento
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div
                  className={`text-lg font-semibold ${
                    maintenanceWindow ? 'text-emerald-300' : 'text-amber-300'
                  }`}
                >
                  {maintenanceWindow ? 'DISPONIBLE' : 'BLOQUEADA'}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Requiere núcleo frío, baja presión y barras casi al 100%.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800/70 bg-slate-900/80 px-4 py-3 text-right">
                <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                  Energía total
                </div>
                <div className="mt-1 text-lg font-semibold text-cyan-300">
                  {sim.energyGenerated.toFixed(2)} MWh
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
            <div className="mb-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Balance operativo
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-800/70 bg-slate-900/75 p-3">
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                  Fondos
                </div>
                <div className="mt-2 text-lg font-semibold text-emerald-300">
                  {formatCurrency(sim.funds)}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800/70 bg-slate-900/75 p-3">
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                  Fisión
                </div>
                <div
                  className={`mt-2 inline-flex rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.22em] ${getFissionToneClass(sim.fissionState)}`}
                >
                  {sim.fissionState}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800/70 bg-slate-900/75 p-3">
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                  Tarifa
                </div>
                <div className="mt-2 text-lg font-semibold text-cyan-300">
                  {formatCurrency(computeExportPrice(sim))}/MWh
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800/70 bg-slate-900/75 p-3">
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                  Ingreso/min
                </div>
                <div className="mt-2 text-lg font-semibold text-emerald-300">
                  {formatCurrency(computeRevenuePerMinute(sim))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel-glass rounded-[30px] border border-slate-800/80 p-5">
        <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-slate-400">
          <Activity className="h-4 w-4 text-cyan-300" />
          Registro operacional
        </div>

        <div className="max-h-[460px] space-y-2 overflow-y-auto rounded-2xl border border-slate-800/70 bg-slate-950/70 p-3">
          {sim.logs.map((log) => (
            <div
              key={log.id}
              className={`rounded-2xl border border-slate-800/60 border-l-4 bg-slate-950/60 px-3 py-2 text-sm ${logBorderColors[log.level]} ${logColors[log.level]}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-slate-800/70 bg-slate-900/80 px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-slate-500">
                    {log.level}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.22em] text-slate-600">
                    {inferLogSubsystem(log.message)}
                  </span>
                </div>
                <span className="text-[10px] uppercase tracking-[0.24em] text-slate-600">
                  {log.timestamp}
                </span>
              </div>
              <div className="mt-1 leading-relaxed">{log.message}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-glass rounded-[30px] border border-slate-800/80 p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-slate-400">
            <Wrench className="h-4 w-4 text-cyan-300" />
            Mejoras de Planta
          </div>
          <span className="rounded-full border border-slate-800/70 bg-slate-950/70 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-slate-400">
            permanentes
          </span>
        </div>

        <div className="grid gap-3">
          <div className={`rounded-2xl border p-4 transition-all duration-300 ${sim.upgrades.fastRods ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-800/70 bg-slate-950/70'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-200">Mecanismos Rápidos</div>
                <div className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Los motores de las barras de control se mueven al doble de velocidad. Útil para reaccionar rápido a transitorios.
                </div>
              </div>
              {sim.upgrades.fastRods ? (
                <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-emerald-300">
                  Instalada
                </span>
              ) : (
                <button
                  onClick={() => onBuyUpgrade('fastRods')}
                  className="shrink-0 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                >
                  $8,000
                </button>
              )}
            </div>
          </div>

          <div className={`rounded-2xl border p-4 transition-all duration-300 ${sim.upgrades.heavyPumps ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-800/70 bg-slate-950/70'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-200">Bombas Reforzadas</div>
                <div className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Las bombas primarias sufren 50% menos desgaste mecánico, incluso en sobreimpulso constante.
                </div>
              </div>
              {sim.upgrades.heavyPumps ? (
                <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-emerald-300">
                  Instalada
                </span>
              ) : (
                <button
                  onClick={() => onBuyUpgrade('heavyPumps')}
                  className="shrink-0 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                >
                  $12,000
                </button>
              )}
            </div>
          </div>

          <div className={`rounded-2xl border p-4 transition-all duration-300 ${sim.upgrades.betterInsulation ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-800/70 bg-slate-950/70'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-200">Aislamiento Térmico</div>
                <div className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Reduce un 50% las pérdidas térmicas en caso de fuga o degradación de la contención, manteniendo el T en banda.
                </div>
              </div>
              {sim.upgrades.betterInsulation ? (
                <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-emerald-300">
                  Instalada
                </span>
              ) : (
                <button
                  onClick={() => onBuyUpgrade('betterInsulation')}
                  className="shrink-0 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                >
                  $10,000
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function GameOverModal({ sim, open, onRestart }: GameOverModalProps) {
  if (!open) return null;

  const failureLogs = sim.logs.filter(
    (log) =>
      log.message.includes('Diagnóstico final:') ||
      log.message.includes('Qué salió mal:') ||
      log.level === 'CRITICAL',
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <div className="panel-glass max-w-lg rounded-[32px] border border-rose-500/30 p-8 text-center shadow-[0_0_80px_rgba(244,63,94,0.18)]">
        <AlertTriangle className="mx-auto h-16 w-16 animate-pulse text-rose-400" />
        <h2 className="mt-4 text-3xl font-semibold tracking-[0.12em] text-rose-200">
          {sim.gameState === 'MELTDOWN'
            ? 'Fusión del núcleo'
            : 'Explosión del reactor'}
        </h2>
        <p className="mt-3 text-slate-300">
          La simulación excedió su envolvente segura. Revisa el monitor, recupera margen operativo y vuelve a intentarlo.
        </p>

        <div className="mt-6 rounded-2xl border border-slate-800/70 bg-slate-950/70 p-4 text-left">
          <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
            Registro de fallo
          </div>
          <div className="mt-3 space-y-2">
            {failureLogs.slice(0, 3).map((log) => (
              <div
                key={log.id}
                className={`rounded-2xl border border-slate-800/60 border-l-4 bg-slate-950/60 px-3 py-2 text-sm ${logBorderColors[log.level]} ${logColors[log.level]}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                    {inferLogSubsystem(log.message)}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.24em] text-slate-600">
                    {log.timestamp}
                  </span>
                </div>
                <div className="mt-1 leading-relaxed">{log.message}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/70 p-4">
            <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
              Energía
            </div>
            <div className="mt-2 text-lg font-semibold text-cyan-300">
              {sim.energyGenerated.toFixed(2)} MWh
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/70 p-4">
            <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
              Fondos
            </div>
            <div className="mt-2 text-lg font-semibold text-emerald-300">
              {formatCurrency(sim.funds)}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/70 p-4">
            <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
              Radiación
            </div>
            <div className="mt-2 text-lg font-semibold text-rose-300">
              {formatRadiation(sim.radiationLevel)}
            </div>
          </div>
        </div>

        <button
          onClick={onRestart}
          className="mt-6 w-full rounded-2xl border border-rose-500/30 bg-rose-500/15 px-4 py-3 text-sm font-medium text-rose-100 transition hover:bg-rose-500/25"
        >
          Reiniciar simulación
        </button>
      </div>
    </div>
  );
}
