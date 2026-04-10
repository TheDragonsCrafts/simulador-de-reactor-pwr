import type { CSSProperties } from 'react';
import {
  AlertTriangle,
  Droplet,
  Flame,
  FlaskConical,
  Gauge,
  Orbit,
  Power,
  Radio,
  RefreshCw,
  Shield,
  ShieldAlert,
  Thermometer,
  Waves,
  Wind,
  Wrench,
  Zap,
} from 'lucide-react';

import {
  COOLANT_PROFILES,
  SHIELD_ZONES,
  SHIELD_ACTIVATION_COST,
  SHIELD_REPAIR_COST,
  CLEAN_PLANT_THRESHOLD,
  CLEAN_PLANT_BONUS,
  buildDetectors,
  getCoolantProfile,
  getOverclockBlockers,
  isCleanPlant,
  maintenanceWindowOpen,
  overclockReady,
  PRIMARY_PUMP_MAX_DEMAND,
  refuelWindowOpen,
  getReactorSteamDrive,
  getContainmentSprayIntensity,
  getContainmentReleaseRate,
  type AlertItem,
  type CoolantProfile,
  type SimulationState,
} from '../sim';
import {
  MetricBar,
  TrendCard,
  clamp,
  getDetectorTone,
  getFissionToneClass,
  getSeverityClasses,
  getStatusColorClass,
} from './shared';

interface ReactorPageProps {
  sim: SimulationState;
  alerts: AlertItem[];
  onControlRods: (value: number) => void;
  onTogglePrimaryPump: () => void;
  onSetPrimaryPumpDemand: (value: number) => void;
  onTogglePurgeValve: () => void;
  onToggleContainmentSpray: () => void;
  onToggleMakeupPump: () => void;
  onTriggerLeak: () => void;
  onInjectBoron: () => void;
  onSetCoolantProfile: (profile: CoolantProfile) => void;
  onRepairPump: (type: 'primary' | 'secondary') => void;
  onPerformMaintenance: () => void;
  onRefuel: () => void;
  onScram: () => void;
  onTriggerOverclock: () => void;
  onToggleRadiationShield: (zone: number) => void;
  onRepairShields: () => void;
}

function ReactorScene({ sim }: { sim: SimulationState }) {
  const coolantProfile = getCoolantProfile(sim.coolantProfile);
  const radiationOpacity = clamp(sim.radiationLevel / 120, 0.12, 0.95);
  const breachRatio = clamp((100 - sim.containmentIntegrity) / 100, 0, 1);
  const exposedCoreRatio = clamp((100 - sim.coolantLevel) / 100, 0, 1);
  const steamDrive = getReactorSteamDrive(sim);
  const sprayIntensity = getContainmentSprayIntensity(sim);
  const releaseRate = getContainmentReleaseRate(sim);

  const coreColorBase =
    sim.coreTemp > 900
      ? '244,63,94'
      : sim.coreTemp > 500
        ? '251,146,60'
        : '250,204,21';

  const reactorGlowStyle = {
    background: `radial-gradient(circle at 50% 50%, rgba(${coreColorBase},${clamp(
      sim.coreTemp / 1200 + exposedCoreRatio * 0.14,
      0.3,
      0.9,
    )}) 0%, rgba(${coreColorBase},${clamp(sim.reactivity, 0.15, 0.7)}) 30%, rgba(34,211,238,${clamp(
      sim.radiationLevel / 180,
      0.05,
      0.45,
    )}) 60%, transparent 100%)`,
    boxShadow: `0 0 ${40 + sim.radiationLevel * 1.5}px rgba(34,211,238,${clamp(
      sim.radiationLevel / 180,
      0.2,
      0.6,
    )})`,
  } as CSSProperties;

  return (
    <div className="panel-glass overflow-hidden rounded-[32px] border border-slate-800/80 p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-slate-400">
            <Flame className="h-4 w-4 text-cyan-300" />
            Vasija de Presión
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Vista del primario: núcleo, barras, purga y spray.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.24em] ${coolantProfile.accent}`}
          >
            {coolantProfile.shortLabel}
          </span>
          <span
            className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.24em] ${getFissionToneClass(
              sim.fissionState,
            )}`}
          >
            {sim.fissionState}
          </span>
        </div>
      </div>

      {/* Main Reactor Graphic Container */}
      <div className="relative mx-auto w-full max-w-[650px] aspect-[4/5] sm:aspect-[4/4] xl:aspect-[5/4] 2xl:aspect-[16/10] overflow-hidden rounded-[40px] border border-cyan-500/10 bg-slate-950/95 shadow-[inset_0_0_60px_rgba(8,47,73,0.6)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.06),transparent_40%),radial-gradient(circle_at_bottom,rgba(14,165,233,0.06),transparent_40%)]" />

        {/* Clean, separated stats overlay */}
        <div className="absolute inset-x-0 top-4 z-20 flex justify-between px-4 sm:px-6 pointer-events-none">
          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/80 px-3 py-2 text-left pointer-events-auto backdrop-blur-md">
            <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.22em] text-slate-500">
              Presión Vapor
            </div>
            <div className="mt-1 text-base font-semibold text-cyan-300">
              {steamDrive.toFixed(0)}%
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/80 px-3 py-2 text-right pointer-events-auto backdrop-blur-md">
            <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.22em] text-slate-500">
              Rsv. Spray
            </div>
            <div className="mt-1 text-base font-semibold text-sky-300">
              {sim.sprayReserve.toFixed(0)}%
            </div>
          </div>
        </div>

        {/* --- Steam Output Pipe --- */}
        <div className="absolute right-[5%] top-[20%] w-[30%] h-8 sm:h-12 pipe-segment rounded-r-2xl z-0 shadow-lg">
          {[0, 1, 2, 3].map((stream) => (
            <span
              key={`to-turbine-${stream}`}
              className="steam-pulse absolute top-[30%] h-[40%] rounded-full bg-gradient-to-r from-cyan-300/0 via-cyan-200/80 to-white/0"
              style={
                {
                  left: '10%',
                  width: '40%',
                  opacity: clamp(steamDrive / 100 - stream * 0.15, 0.08, 0.9),
                  animationDuration: `${1.0 + stream * 0.2}s`,
                  animationDelay: `${stream * 0.15}s`,
                } as CSSProperties
              }
            />
          ))}
          <div className="absolute right-4 -top-6 text-[10px] uppercase tracking-[0.2em] text-cyan-200 whitespace-nowrap">
            A TURBINA
          </div>
        </div>

        {/* --- Purge Valve Assembly --- */}
        <div className="absolute left-[5%] top-[20%] w-[25%] h-6 sm:h-8 pipe-segment rounded-l-2xl z-0 flex items-center justify-center shadow-lg">
          <div
            className={`px-2 py-0.5 rounded-full border text-[9px] sm:text-[10px] uppercase tracking-[0.2em] transition-colors ${
              sim.purgeValveOpen
                ? 'border-amber-500/50 bg-amber-500/20 text-amber-200'
                : 'border-slate-600 bg-slate-800 text-slate-400'
            }`}
          >
            {sim.purgeValveOpen ? `${sim.purgeOpenSeconds}s` : 'PURGA'}
          </div>
        </div>

        {/* --- Reactor Vessel --- */}
        <div className="absolute left-[20%] right-[20%] sm:left-[28%] sm:right-[28%] top-[15%] bottom-[8%] glass-vessel rounded-[60px] sm:rounded-[80px] z-10 flex flex-col justify-end overflow-hidden">
          {/* Coolant Liquid */}
          <div
            className="absolute inset-x-0 bottom-0 liquid-gradient transition-all duration-[2000ms] ease-in-out"
            style={{ height: `${sim.coolantLevel}%` }}
          >
            {/* Boiling Bubbles */}
            {sim.coreTemp > 120 &&
              Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={`bubble-${i}`}
                  className="absolute bottom-0 rounded-full bg-cyan-100/40 blur-[0.5px]"
                  style={{
                    left: `${5 + (i * 13) % 90}%`,
                    width: `${4 + (i % 5)}px`,
                    height: `${4 + (i % 5)}px`,
                    animation: `bubbleRise ${0.8 + (i % 4) * 0.4 + (1000 / sim.coreTemp)}s infinite ease-in`,
                    animationDelay: `${(i * 0.17) % 2}s`,
                  }}
                />
              ))}
          </div>

          {/* Radiation Rings */}
          {[0, 1, 2].map((ring) => (
            <div
              key={`ring-${ring}`}
              className="reactor-ring absolute left-[15%] right-[15%] top-[25%] bottom-[25%] rounded-[40px] sm:rounded-full border-[1.5px] border-cyan-300/30"
              style={{
                animationDelay: `${ring * 0.8}s`,
                opacity: clamp(radiationOpacity - ring * 0.15, 0.05, 0.8),
              }}
            />
          ))}

          {/* Neutron Orbits */}
          <div className="absolute inset-[25%] pointer-events-none">
            {[0, 1, 2].map((track) => (
              <div
                key={`track-${track}`}
                className="neutron-orbit absolute inset-0 rounded-full border-[0.5px] border-sky-300/20"
                style={
                  {
                    '--orbit-scale': `${1 + track * 0.25}`,
                    '--orbit-tilt': `${track * 45}deg`,
                    animationDuration: `${5 + track * 1.5}s`,
                    opacity: clamp(sim.neutronFlux / 100 - track * 0.1, 0.1, 0.8),
                  } as CSSProperties
                }
              >
                <span className="neutron-node absolute left-1/2 top-[-5px] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-sky-100 shadow-[0_0_12px_#7dd3fc]" />
              </div>
            ))}
          </div>

          {/* Core Glow */}
          <div
            className="absolute left-[20%] right-[20%] bottom-[15%] top-[45%] rounded-full core-pulse"
            style={reactorGlowStyle}
          />

          {/* Control Rods Array */}
          <div className="absolute inset-x-[15%] top-[-5%] bottom-[15%] flex justify-evenly px-2 sm:px-6 pointer-events-none">
            {[0, 1, 2, 3, 4].map((rod) => (
              <div key={`rod-${rod}`} className="relative h-full w-3 sm:w-4 bg-slate-900/60 rounded-full shadow-inner overflow-hidden">
                <div
                  className="absolute top-0 w-full rounded-b-full control-rod transition-all duration-[1200ms] ease-out"
                  style={{ height: `${sim.controlRods}%` }}
                >
                  <div className="absolute bottom-0 w-full h-4 bg-gradient-to-t from-cyan-200/80 to-transparent rounded-b-full shadow-[0_4px_10px_rgba(103,232,249,0.5)]" />
                </div>
                {/* Target Line */}
                <div
                  className="absolute left-[-2px] right-[-2px] border-t-2 border-dashed border-cyan-300/60 transition-all duration-[600ms]"
                  style={{ top: `${sim.controlRodsTarget}%` }}
                />
              </div>
            ))}
          </div>

          {/* Radiation Particles */}
          {[
            [20, 30],
            [80, 40],
            [60, 70],
            [40, 80],
          ].map(([left, top], index) => (
            <span
              key={`rad-${index}`}
              className="radiation-particle absolute h-2 sm:h-3 w-2 sm:w-3 rounded-full bg-cyan-200 shadow-[0_0_15px_rgba(103,232,249,0.8)]"
              style={
                {
                  left: `${left}%`,
                  top: `${top}%`,
                  opacity: clamp(radiationOpacity - index * 0.1, 0.1, 1),
                  animationDelay: `${index * 0.4}s`,
                  animationDuration: `${3 + index * 0.5}s`,
                } as CSSProperties
              }
            />
          ))}
        </div>

        {/* --- Containment Spray --- */}
        {sim.containmentSprayActive && (
          <div className="absolute inset-x-[20%] sm:inset-x-[28%] top-[5%] h-[20%] z-20 pointer-events-none overflow-hidden">
            {[10, 30, 50, 70, 90].map((left, nozzle) => (
              <span
                key={`spray-${left}`}
                className="absolute top-0 h-full w-12 sm:w-16 rounded-full bg-gradient-to-b from-cyan-100/10 via-cyan-100/50 to-cyan-300/0 origin-top"
                style={
                  {
                    left: `calc(${left}% - 24px)`,
                    opacity: clamp(sprayIntensity - nozzle * 0.05, 0.2, 0.9),
                    animation: `ventRelease ${1.0 + nozzle * 0.15}s ease-out infinite`,
                    animationDelay: `${nozzle * 0.1}s`,
                    '--plume-scale': `${1 + nozzle * 0.1}`,
                    '--plume-rise': '0px', // Fall down instead of rise
                    transform: 'scaleY(1)',
                  } as CSSProperties
                }
              />
            ))}
          </div>
        )}

        {/* --- Purge / Release Plumes --- */}
        {releaseRate > 10 && (
          <div className="absolute left-[17%] top-0 h-[25%] w-24 z-20 pointer-events-none">
            {[0, 1, 2].map((vent) => (
              <span
                key={`vent-${vent}`}
                className="release-plume absolute left-[20%] bottom-0 h-16 sm:h-24 w-12 sm:w-16 rounded-full bg-gradient-to-t from-cyan-200/50 via-white/30 to-transparent origin-bottom"
                style={
                  {
                    opacity: clamp(releaseRate / 100 - vent * 0.15, 0.1, 0.9),
                    animationDuration: `${1.1 + vent * 0.2}s`,
                    animationDelay: `${vent * 0.12}s`,
                    '--plume-scale': `${0.9 + vent * 0.2}`,
                    '--plume-rise': `${20 + vent * 10}px`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        )}

        {/* --- Breach Jets --- */}
        {breachRatio > 0.15 &&
          [
            { side: 'left', top: '50%', deg: '-25deg' },
            { side: 'right', top: '65%', deg: '25deg' },
          ].map((leak, index) => (
            <span
              key={`breach-${index}`}
              className={`breach-jet absolute ${leak.side === 'left' ? 'left-[25%] sm:left-[33%]' : 'right-[25%] sm:right-[33%]'} z-20 h-16 sm:h-24 w-12 sm:w-16 bg-gradient-to-r from-rose-400/0 via-rose-300/70 to-cyan-200/0`}
              style={
                {
                  top: leak.top,
                  opacity: clamp(breachRatio - index * 0.15, 0.2, 0.9),
                  animationDuration: `${1.5 + index * 0.2}s`,
                  animationDelay: `${index * 0.15}s`,
                  '--jet-transform': `rotate(${leak.deg}) ${leak.side === 'right' ? 'scaleX(-1)' : ''}`,
                } as CSSProperties
              }
            />
          ))}

        {/* Footer Labels */}
        <div className="absolute inset-x-0 bottom-4 flex justify-between px-6 pointer-events-none text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-slate-500">
          <span>{sim.containmentSprayActive ? 'SPRAY ACTIVO' : 'SISTEMA SPRAY'}</span>
          <span>NÚCLEO PRINCIPAL</span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-sm backdrop-blur-sm">
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
            Temperatura
          </div>
          <div
            className={`mt-2 text-2xl font-semibold ${getStatusColorClass(
              sim.coreTemp,
              350,
              900,
            )}`}
          >
            {sim.coreTemp.toFixed(1)} <span className="text-base text-slate-400 font-medium">°C</span>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-sm backdrop-blur-sm">
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
            Presión
          </div>
          <div
            className={`mt-2 text-2xl font-semibold ${getStatusColorClass(
              sim.pressure,
              16.5,
              18.5,
            )}`}
          >
            {sim.pressure.toFixed(2)} <span className="text-base text-slate-400 font-medium">MPa</span>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-sm backdrop-blur-sm">
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
            Reactividad
          </div>
          <div className="mt-2 text-2xl font-semibold text-cyan-300">
            {(sim.reactivity * 100).toFixed(0)}<span className="text-base text-slate-400 font-medium">%</span>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-sm backdrop-blur-sm">
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
            Flujo Neutrónico
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">
            {sim.neutronFlux.toFixed(0)}<span className="text-base text-slate-400 font-medium">%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReactorPage({
  sim,
  alerts,
  onControlRods,
  onTogglePrimaryPump,
  onSetPrimaryPumpDemand,
  onTogglePurgeValve,
  onToggleContainmentSpray,
  onToggleMakeupPump,
  onTriggerLeak,
  onInjectBoron,
  onSetCoolantProfile,
  onRepairPump,
  onPerformMaintenance,
  onRefuel,
  onScram,
  onTriggerOverclock,
  onToggleRadiationShield,
  onRepairShields,
}: ReactorPageProps) {
  const isGameOver = sim.gameState === 'MELTDOWN' || sim.gameState === 'EXPLOSION';
  const maintenanceWindow = maintenanceWindowOpen(sim);
  const refuelWindow = refuelWindowOpen(sim);
  const detectors = buildDetectors(sim);
  const overclockBlockers = getOverclockBlockers(sim);
  const overclockEnabled = overclockReady(sim);
  const overclockActive = sim.overclockTicks > 0;
  const overclockCooling = !overclockActive && sim.overclockCooldown > 0;
  const coolantProfile = getCoolantProfile(sim.coolantProfile);

  return (
    <section className="space-y-6">
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]">
        <ReactorScene sim={sim} />

        <div className="space-y-6">
          <div className="panel-glass rounded-[32px] border border-slate-800/80 p-5">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-slate-400">
              <AlertTriangle className="h-4 w-4 text-cyan-300" />
              Avisos del reactor
            </div>
            <div className="space-y-3">
              {alerts.length > 0 ? (
                alerts.slice(0, 4).map((alert) => (
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
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                  El reactor está dentro de su banda operativa y no reporta avisos relevantes.
                </div>
              )}
            </div>
          </div>

          <div className="panel-glass rounded-[32px] border border-slate-800/80 p-5">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-slate-400">
              <Orbit className="h-4 w-4 text-cyan-300" />
              Estado de fisión
            </div>
            <div className="space-y-4">
              <div
                className={`inline-flex rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.22em] ${getFissionToneClass(
                  sim.fissionState,
                )}`}
              >
                {sim.fissionState}
              </div>
              <MetricBar
                label="Reactividad efectiva"
                valueLabel={`${(sim.reactivity * 100).toFixed(0)}%`}
                value={sim.reactivity * 100}
                fillClassName="bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400"
              />
              <MetricBar
                label="Veneno de xenón"
                valueLabel={`${sim.xenonPoisoning.toFixed(1)}%`}
                value={Math.min(sim.xenonPoisoning, 100)}
                fillClassName="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400"
              />
              <MetricBar
                label="Vacíos de vapor"
                valueLabel={`${sim.steamVoids.toFixed(0)}%`}
                value={sim.steamVoids}
                fillClassName="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TrendCard
          title="Temperatura"
          icon={Thermometer}
          values={sim.history.temp}
          value={`${sim.coreTemp.toFixed(1)} C`}
          subtitle="núcleo"
          stroke="#fb923c"
          fill="#fb923c"
          accentClassName={getStatusColorClass(sim.coreTemp, 350, 900)}
        />
        <TrendCard
          title="Presión"
          icon={Gauge}
          values={sim.history.pressure}
          value={`${sim.pressure.toFixed(2)} MPa`}
          subtitle="primario"
          stroke="#38bdf8"
          fill="#38bdf8"
          accentClassName={getStatusColorClass(sim.pressure, 16.5, 18.5)}
        />
        <TrendCard
          title="Primario"
          icon={Waves}
          values={sim.history.primaryFlow}
          value={`${sim.primaryPumpFlow.toFixed(0)}%`}
          subtitle="caudal real"
          stroke="#22d3ee"
          fill="#22d3ee"
          accentClassName="text-cyan-300"
        />
        <TrendCard
          title="Reactividad"
          icon={Radio}
          values={sim.history.reactivity}
          value={`${(sim.reactivity * 100).toFixed(0)}%`}
          subtitle="efectiva"
          stroke="#6366f1"
          fill="#6366f1"
          accentClassName="text-indigo-300"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="panel-glass rounded-[32px] border border-slate-800/80 p-5">
          <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-slate-400">
            <Power className="h-4 w-4 text-cyan-300" />
            Panel de mecanismos del reactor
          </div>

          <div className="space-y-5">
            <div className="rounded-[28px] border border-slate-800/70 bg-slate-950/60 p-4">
              <div className="mb-2 flex items-center justify-between gap-4">
                <label className="text-sm font-medium text-slate-200">
                  Barras de control
                </label>
                <span className="text-right text-xs uppercase tracking-[0.24em] text-slate-500">
                  consigna {sim.controlRodsTarget.toFixed(0)}% | real {sim.controlRods.toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={sim.controlRodsTarget}
                onChange={(event) => onControlRods(Number(event.target.value))}
                disabled={isGameOver}
                className="control-slider w-full"
              />
              <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.24em] text-slate-500">
                <span>0% máximo flujo</span>
                <span>100% apagado</span>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
              <div className="rounded-[28px] border border-slate-800/70 bg-slate-950/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <RefreshCw
                      className={`h-4 w-4 ${
                        sim.primaryPumpActive && sim.primaryPumpHealth > 0
                          ? 'animate-spin text-sky-300'
                          : 'text-slate-600'
                      }`}
                    />
                    <span className="text-sm text-slate-200">Bomba primaria</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.24em] ${
                        sim.primaryPumpDemand > 100
                          ? 'border-amber-500/35 bg-amber-500/10 text-amber-100'
                          : 'border-slate-800/70 bg-slate-950/80 text-slate-300'
                      }`}
                    >
                      {sim.primaryPumpDemand > 100 ? 'boost' : 'nominal'}
                    </span>
                    <button
                      onClick={onTogglePrimaryPump}
                      disabled={isGameOver}
                      className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.24em] transition ${
                        sim.primaryPumpActive
                          ? 'border-sky-500/40 bg-sky-500/10 text-sky-200'
                          : 'border-slate-700 bg-slate-900 text-slate-400'
                      } disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-1`}
                    >
                      {sim.primaryPumpActive ? 'ON' : 'OFF'}
                      <span className="hidden opacity-50 sm:inline-block ml-1">[P]</span>
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-slate-400">
                  Ahora puedes fijar la consigna del primario. Por encima de 100% entras en
                  sobreimpulso: sacas más calor del núcleo, pero desgastas la bomba bastante
                  más rápido.
                </p>

                <div className="mt-4 rounded-[24px] border border-slate-800/70 bg-slate-950/80 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    <span>Consigna de caudal</span>
                    <span>{sim.primaryPumpDemand.toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={PRIMARY_PUMP_MAX_DEMAND}
                    value={sim.primaryPumpDemand}
                    onChange={(event) => onSetPrimaryPumpDemand(Number(event.target.value))}
                    disabled={isGameOver}
                    className="control-slider w-full"
                  />
                  <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.24em] text-slate-500">
                    <span>paro</span>
                    <span>100% nominal</span>
                    <span>{PRIMARY_PUMP_MAX_DEMAND}% boost</span>
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {[
                      { label: 'Eco', value: 55 },
                      { label: 'Base', value: 82 },
                      { label: 'Full', value: 100 },
                      { label: 'Boost', value: PRIMARY_PUMP_MAX_DEMAND },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => onSetPrimaryPumpDemand(preset.value)}
                        disabled={isGameOver}
                        className={`rounded-2xl border px-3 py-2 text-[11px] uppercase tracking-[0.22em] transition ${
                          Math.round(sim.primaryPumpDemand) === preset.value
                            ? 'border-cyan-500/35 bg-cyan-500/10 text-cyan-100'
                            : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700'
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  <MetricBar
                    label="Salud"
                    valueLabel={`${sim.primaryPumpHealth.toFixed(1)}%`}
                    value={sim.primaryPumpHealth}
                    fillClassName="bg-gradient-to-r from-sky-400 to-cyan-400"
                  />
                  <MetricBar
                    label="Demanda"
                    valueLabel={`${sim.primaryPumpDemand.toFixed(0)}%`}
                    value={(sim.primaryPumpDemand / PRIMARY_PUMP_MAX_DEMAND) * 100}
                    fillClassName={
                      sim.primaryPumpDemand > 100
                        ? 'bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400'
                        : 'bg-gradient-to-r from-sky-300 to-cyan-400'
                    }
                  />
                  <MetricBar
                    label="Caudal real"
                    valueLabel={`${sim.primaryPumpFlow.toFixed(0)}%`}
                    value={(sim.primaryPumpFlow / PRIMARY_PUMP_MAX_DEMAND) * 100}
                    fillClassName="bg-gradient-to-r from-cyan-300 to-sky-400"
                  />
                </div>

                <button
                  onClick={() => onRepairPump('primary')}
                  disabled={isGameOver}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-slate-200 transition hover:border-slate-700 hover:bg-slate-800/80 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Wrench className="h-4 w-4 text-cyan-300" />
                  Reparar bomba primaria
                </button>
              </div>

              <div className="space-y-4">
                <div
                  className={`rounded-[28px] border p-4 ${
                    overclockActive
                      ? 'border-rose-500/35 bg-rose-500/10'
                      : overclockCooling
                        ? 'border-amber-500/30 bg-amber-500/10'
                        : 'border-slate-800/70 bg-slate-950/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-300">
                        <Zap className="h-4 w-4 text-cyan-300" />
                        Overclock térmico
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-400">
                        Pulso breve de potencia para levantar MW rápido. Exige P1/P2 sanos y
                        deja un cooldown térmico después.
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] ${
                        overclockActive
                          ? 'border-rose-500/40 bg-rose-500/10 text-rose-100'
                          : overclockCooling
                            ? 'border-amber-500/35 bg-amber-500/10 text-amber-100'
                            : 'border-emerald-500/35 bg-emerald-500/10 text-emerald-100'
                      }`}
                    >
                      {overclockActive
                        ? `${sim.overclockTicks}s`
                        : overclockCooling
                          ? `cooldown ${sim.overclockCooldown}s`
                          : 'listo'}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    <MetricBar
                      label="Potencia térmica"
                      valueLabel={`${sim.thermalPower.toFixed(0)} MWt`}
                      value={clamp((sim.thermalPower / 1600) * 100, 0, 100)}
                      fillClassName="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400"
                    />
                    <MetricBar
                      label="Ventana de activación"
                      valueLabel={overclockEnabled ? 'abierta' : 'cerrada'}
                      value={overclockEnabled ? 100 : Math.max(18, 100 - overclockBlockers.length * 20)}
                      fillClassName={
                        overclockEnabled
                          ? 'bg-gradient-to-r from-emerald-400 to-cyan-400'
                          : 'bg-gradient-to-r from-amber-400 to-rose-400'
                      }
                    />
                  </div>

                  {!overclockEnabled && (
                    <div className="mt-4 rounded-2xl border border-slate-800/70 bg-slate-950/70 p-3 text-xs text-slate-300">
                      {overclockBlockers.slice(0, 2).join(', ')}.
                    </div>
                  )}

                  <button
                    onClick={onTriggerOverclock}
                    disabled={isGameOver || !overclockEnabled}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/12 px-4 py-3 text-sm font-medium text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Zap className="h-4 w-4" />
                    Activar overclock <span className="opacity-50 text-xs ml-1">[O]</span>
                  </button>
                </div>

                <details className="group rounded-[28px] border border-slate-800/70 bg-slate-950/60 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="cursor-pointer p-4 outline-none flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-300">
                      <Shield className="h-4 w-4 text-cyan-300" />
                      Sistemas de Emergencia y Soporte
                    </div>
                    <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="px-4 pb-4 grid gap-3">
                    <button
                      onClick={onTogglePurgeValve}
                      disabled={isGameOver}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        sim.purgeValveOpen
                          ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
                          : 'border-slate-800 bg-slate-950/60 text-slate-200 hover:border-slate-700'
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em]">
                        <Wind className="h-4 w-4" />
                        Purga controlada
                      </div>
                      <p className="mt-2 text-xs text-slate-400">
                        Reduce presión a costa de inventario del primario y más radiación ambiental.
                      </p>
                    </button>

                    <button
                      onClick={onToggleContainmentSpray}
                      disabled={isGameOver}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        sim.containmentSprayActive
                          ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-100'
                          : 'border-slate-800 bg-slate-950/60 text-slate-200 hover:border-slate-700'
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em]">
                        <Shield className="h-4 w-4" />
                        Spray de contención
                      </div>
                      <p className="mt-2 text-xs text-slate-400">
                        Baja presión y radiación, pero consume agua de reserva.
                      </p>
                    </button>

                    <button
                      onClick={onToggleMakeupPump}
                      disabled={isGameOver}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        sim.makeupPumpRunning
                          ? 'border-sky-500/40 bg-sky-500/10 text-sky-100'
                          : 'border-slate-800 bg-slate-950/60 text-slate-200 hover:border-slate-700'
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em]">
                        <Droplet className="h-4 w-4" />
                        Bomba de Make-Up
                      </div>
                      <p className="mt-2 text-xs text-slate-400">
                        Repone agua al circuito primario para compensar pérdidas (LOCA).
                      </p>
                    </button>

                    <button
                      onClick={onTriggerLeak}
                      disabled={isGameOver}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        sim.coolantLeakRate > 0
                          ? 'border-rose-500/40 bg-rose-500/10 text-rose-100'
                          : 'border-slate-800 bg-slate-950/60 text-slate-200 hover:border-slate-700'
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em]">
                        <AlertTriangle className="h-4 w-4" />
                        Fuga de Refrigerante (Test)
                      </div>
                      <p className="mt-2 text-xs text-slate-400">
                        Simula un LOCA menor para testear la respuesta del circuito y del operador.
                      </p>
                    </button>
                  </div>
                </details>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-800/70 bg-slate-950/60 p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-200">
                    <Droplet className="h-4 w-4 text-sky-300" />
                    Circuito de refrigerante
                  </div>
                  <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400">
                    El make-up mantiene el inventario al 100% y la química se corrige sola.
                    Tu decisión ahora es estratégica: elegir qué blend quieres correr según si
                    buscas estabilidad, blindaje o más dinero.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800/70 bg-slate-950/80 px-3 py-2 text-right">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                    circuito activo
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-100">
                    {coolantProfile.label}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {COOLANT_PROFILES.map((profile) => {
                  const active = sim.coolantProfile === profile.id;

                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => onSetCoolantProfile(profile.id)}
                      disabled={isGameOver}
                      className={`rounded-[24px] border px-4 py-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        active
                          ? `${profile.accent} shadow-[0_0_24px_rgba(34,211,238,0.08)]`
                          : 'border-slate-800 bg-slate-950/70 text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold">{profile.label}</div>
                        <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-slate-200/80">
                          {active ? 'activo' : '$650'}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-400">
                        {profile.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {profile.effects.map((effect) => (
                          <span
                            key={effect}
                            className="rounded-full border border-slate-800/70 bg-slate-950/80 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-slate-300"
                          >
                            {effect}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <button
                onClick={onInjectBoron}
                disabled={isGameOver}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-left transition hover:border-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-200">
                    <FlaskConical className="h-4 w-4 text-indigo-300" />
                    Inyección de boro
                  </div>
                  <span className="text-[10px] text-slate-500 opacity-60">[B]</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Inserta margen negativo de reactividad.
                </p>
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <button
                onClick={onPerformMaintenance}
                disabled={isGameOver}
                className={`rounded-2xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  maintenanceWindow
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-50 hover:bg-emerald-500/15'
                    : 'border-slate-800 bg-slate-950/60 text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em]">
                  <Shield className="h-4 w-4" />
                  Mantenimiento preventivo
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Disponible con núcleo frío, baja presión y barras altas.
                </p>
              </button>

              <button
                onClick={onRefuel}
                disabled={isGameOver}
                className={`rounded-2xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  refuelWindow
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-50 hover:bg-emerald-500/15'
                    : 'border-slate-800 bg-slate-950/60 text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em]">
                  <Droplet className="h-4 w-4" />
                  Recarga de combustible
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Solo con la planta prácticamente fría y despresurizada.
                </p>
              </button>
            </div>

            <button
              onClick={onScram}
              disabled={isGameOver}
              className="flex items-center justify-center gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShieldAlert className="h-4 w-4" />
              SCRAM de emergencia <span className="opacity-50 text-xs ml-1">[ESPACIO]</span>
            </button>
          </div>
        </div>

        <div className="panel-glass rounded-[32px] border border-slate-800/80 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-slate-400">
              <Radio className="h-4 w-4 text-cyan-300" />
              Detectores de radiación
            </div>
            <div className="flex items-center gap-2">
              {isCleanPlant(detectors) && (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-emerald-200">
                  ✦ planta limpia +${CLEAN_PLANT_BONUS}/MWh
                </span>
              )}
              <span className="rounded-full border border-slate-800/70 bg-slate-950/70 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-slate-400">
                edificio y anillo
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {detectors.map((detector, index) => {
              const tone = getDetectorTone(detector.value);
              const hasShield = sim.radiationShields[index];
              const efficiency = sim.shieldEfficiency[index];

              return (
                <div
                  key={detector.label}
                  className={`rounded-2xl border p-4 transition-all duration-300 ${
                    hasShield
                      ? 'border-cyan-500/25 bg-cyan-500/5 shield-active'
                      : 'border-slate-800/70 bg-slate-950/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.24em] text-slate-500">
                        {detector.label}
                      </div>
                      <div className="mt-1 text-sm text-slate-300">{detector.zone}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasShield && (
                        <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-cyan-200">
                          {efficiency.toFixed(0)}%
                        </span>
                      )}
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.24em] ${tone.badge}`}
                      >
                        {tone.label}
                      </span>
                    </div>
                  </div>
                  <div className={`mt-3 text-xl font-semibold font-mono text-slate-100`}>
                    {detector.value < 1
                      ? `${Math.round(detector.value * 1000)} uSv/h`
                      : `${detector.value.toFixed(1)} mSv/h`}
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-800/80 geiger-bar" style={{
                    '--geiger-speed': `${Math.max(0.4, 3 - detector.value * 0.04)}s`,
                  } as CSSProperties}>
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${tone.bar}`}
                      style={{ width: `${clamp(detector.value / 0.6, 0, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Shield Control Panel */}
          <div className="mt-5 rounded-[28px] border border-slate-800/70 bg-slate-950/60 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-400">
                  <Shield className="h-4 w-4 text-cyan-300" />
                  Blindaje de radiación activo
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Cada escudo reduce la radiación de su zona, pero redistribuye parte a las zonas sin protección.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-slate-800/70 bg-slate-950/80 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-slate-400">
                  ${SHIELD_ACTIVATION_COST.toLocaleString('es-MX')} por escudo
                </span>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {SHIELD_ZONES.map((zone) => {
                const active = sim.radiationShields[zone.id];
                const eff = sim.shieldEfficiency[zone.id];
                const degraded = eff < 50;

                return (
                  <button
                    key={zone.id}
                    onClick={() => onToggleRadiationShield(zone.id)}
                    disabled={isGameOver}
                    className={`rounded-2xl border px-4 py-3 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                      active
                        ? degraded
                          ? 'border-amber-500/35 bg-amber-500/8 text-amber-50'
                          : 'border-cyan-500/35 bg-cyan-500/8 text-cyan-50'
                        : 'border-slate-800 bg-slate-950/70 text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                          active
                            ? degraded
                              ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                              : 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]'
                            : 'bg-slate-600'
                        }`} />
                        <span className="text-xs uppercase tracking-[0.22em]">
                          {zone.shortLabel} — {zone.label}
                        </span>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] ${
                        active
                          ? degraded
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                            : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200'
                          : 'border-slate-800 bg-slate-900/60 text-slate-500'
                      }`}>
                        {active ? `${eff.toFixed(0)}%` : 'OFF'}
                      </span>
                    </div>
                    {active && (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800/80">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            degraded
                              ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                              : 'bg-gradient-to-r from-cyan-400 to-sky-400'
                          }`}
                          style={{ width: `${eff}%` }}
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={onRepairShields}
                disabled={isGameOver}
                className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-xs text-slate-200 transition hover:border-slate-700 hover:bg-slate-800/80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Wrench className="h-3.5 w-3.5 text-cyan-300" />
                Reparar blindaje (${SHIELD_REPAIR_COST.toLocaleString('es-MX')})
              </button>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-800/70 bg-slate-950/60 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-slate-500">
                Activos: {sim.radiationShields.filter(Boolean).length}/4
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
