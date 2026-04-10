import type { CSSProperties } from 'react';
import {
  AlertTriangle,
  Coins,
  Gauge,
  Power,
  RefreshCw,
  Settings,
  Waves,
  Wrench,
  Zap,
} from 'lucide-react';

import {
  computeExportPrice,
  computeRevenuePerMinute,
  getCoolantProfile,
  maintenanceWindowOpen,
  turbineServiceWindowOpen,
  getTurbineRotorRatio,
  getTurbineRotorRpm,
  getGeneratorLoad,
  getThermalUse,
  getTurbineSteamDrive,
  getTurbineSyncState,
  type AlertItem,
  type SimulationState,
} from '../sim';
import {
  MetricBar,
  SystemRow,
  TrendCard,
  clamp,
  getSeverityClasses,
} from './shared';

interface TurbinePageProps {
  sim: SimulationState;
  alerts: AlertItem[];
  onToggleSecondaryPump: () => void;
  onSetSteamValve: (value: number) => void;
  onRepairPump: (type: 'primary' | 'secondary') => void;
  onServiceTurbine: () => void;
  onPerformMaintenance: () => void;
}

function RotorGlyph({ className = 'h-full w-full' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle
        cx="50"
        cy="50"
        r="36"
        fill="rgba(15,23,42,0.75)"
        stroke="rgba(103,232,249,0.18)"
        strokeWidth="2"
      />
      {[0, 1, 2, 3, 4, 5].map((blade) => (
        <g key={blade} transform={`rotate(${blade * 60} 50 50)`}>
          <path
            d="M50 50 L80 46 L80 54 Z"
            fill="rgba(186,230,253,0.82)"
            opacity="0.92"
          />
        </g>
      ))}
      <circle
        cx="50"
        cy="50"
        r="12"
        fill="rgba(125,211,252,0.38)"
        stroke="rgba(186,230,253,0.6)"
        strokeWidth="2"
      />
    </svg>
  );
}

function TurbineScene({ sim }: { sim: SimulationState }) {
  const coolantProfile = getCoolantProfile(sim.coolantProfile);
  const rotorRatio = getTurbineRotorRatio(sim);
  const rotorRpm = getTurbineRotorRpm(sim);
  const generatorLoad = getGeneratorLoad(sim);
  const thermalUse = getThermalUse(sim);
  const steamDrive = getTurbineSteamDrive(sim);
  const exportPrice = computeExportPrice(sim);
  const revenuePerMinute = computeRevenuePerMinute(sim);
  const syncState = getTurbineSyncState(sim);
  const syncTone =
    syncState === 'Sincronizada'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
      : syncState === 'Acelerando'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
        : 'border-slate-700 bg-slate-900/70 text-slate-300';

  return (
    <div className="panel-glass overflow-hidden rounded-[32px] border border-slate-800/80 p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-slate-400">
            <Zap className="h-4 w-4 text-cyan-300" />
            Turbina y Generador
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Vista dedicada del tren secundario con rotor, vapor útil y carga eléctrica.
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.24em] ${syncTone}`}
        >
          {syncState}
        </span>
      </div>

      {/* Turbine Main Graphic Container */}
      <div className="relative mx-auto w-full aspect-[4/5] sm:aspect-[16/9] lg:aspect-[2/1] xl:aspect-[24/10] overflow-hidden rounded-[40px] border border-cyan-500/10 bg-slate-950/95 shadow-[inset_0_0_60px_rgba(8,47,73,0.6)] flex flex-col justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.06),transparent_40%),radial-gradient(circle_at_bottom,rgba(14,165,233,0.06),transparent_40%)] pointer-events-none" />

        {/* Clean, separated stats overlay inside the graphic */}
        <div className="absolute inset-x-0 top-4 z-20 flex flex-wrap justify-between gap-2 px-4 sm:px-6 pointer-events-none">
          {[
            ['Admisión', `${steamDrive.toFixed(0)}%`, 'text-cyan-300'],
            ['RPM', `${Math.round(rotorRpm).toLocaleString('es-MX')}`, 'text-slate-100'],
            ['Eficiencia', `${sim.turbineEfficiency.toFixed(1)}%`, 'text-emerald-300'],
            ['Caja', `$${Math.round(revenuePerMinute / 1000)}k/min`, 'text-emerald-400'],
          ].map(([label, value, colorClass]) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-800/70 bg-slate-950/80 px-3 py-2 text-center pointer-events-auto backdrop-blur-md flex-1 min-w-[70px] sm:min-w-[100px]"
            >
              <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.22em] text-slate-500">
                {label}
              </div>
              <div className={`mt-1 text-sm sm:text-base font-semibold truncate ${colorClass}`}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Main Drive Shaft */}
        <div className="absolute left-[15%] right-[15%] top-[50%] h-4 -translate-y-1/2 bg-gradient-to-b from-slate-600 via-slate-400 to-slate-700 shadow-xl z-0" />
        <div className="absolute left-[15%] right-[15%] top-[50%] h-4 -translate-y-1/2 border-y border-slate-900/50 z-0" />

        {/* Steam Flow Indicators */}
        {[0, 1, 2, 3].map((stream) => (
          <span
            key={stream}
            className="steam-stream absolute top-[47%] h-6 sm:h-8 rounded-full bg-gradient-to-r from-cyan-300/0 via-cyan-300/60 to-white/0"
            style={
              {
                left: '5%',
                width: `${20 + stream * 15}%`,
                opacity: clamp(steamDrive / 100 - stream * 0.12, 0.1, 0.9),
                animationDuration: `${1.2 + stream * 0.3}s`,
                animationDelay: `${stream * 0.2}s`,
              } as CSSProperties
            }
          />
        ))}

        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-4 lg:gap-8 px-8 sm:px-12 w-full mt-16 sm:mt-0">
          
          {/* Steam Inlet */}
          <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full pipe-segment shadow-lg flex items-center justify-center border-[3px] border-cyan-900/60">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-900/80 shadow-inner flex items-center justify-center">
                 <div className="w-4 h-4 rounded-full bg-cyan-400/80 blur-[2px] animate-pulse" />
              </div>
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">VAPOR</div>
          </div>

          {/* High Pressure Turbine (HP) */}
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="relative turbine-stack flex h-24 w-24 sm:h-32 sm:w-32 lg:h-40 lg:w-40 items-center justify-center rounded-full border-4 border-slate-700/80 bg-gradient-to-br from-slate-800 to-slate-950 shadow-[0_0_30px_rgba(0,0,0,0.8)] overflow-hidden">
               <div className="absolute inset-0 rounded-full border-4 border-slate-600/30" />
               <div
                className="turbine-rotor flex h-[85%] w-[85%] items-center justify-center rounded-full border border-cyan-300/30 bg-slate-900/90 shadow-inner"
                style={{ '--turbine-speed': `${Math.max(0.4, 4.0 - rotorRatio * 3.5)}s` } as CSSProperties}
              >
                <RotorGlyph className="h-full w-full opacity-90" />
              </div>
            </div>
            <div className="text-center bg-slate-950/80 px-3 py-1 rounded-full border border-slate-800/80 backdrop-blur-sm">
              <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-slate-400">TURBINA HP</div>
              <div className="text-sm sm:text-base font-semibold text-slate-100">{Math.round(rotorRpm).toLocaleString()} rpm</div>
            </div>
          </div>

          {/* Low Pressure Turbine (LP) */}
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="relative turbine-stack flex h-20 w-20 sm:h-28 sm:w-28 lg:h-36 lg:w-36 items-center justify-center rounded-full border-4 border-slate-700/80 bg-gradient-to-br from-slate-800 to-slate-950 shadow-[0_0_30px_rgba(0,0,0,0.8)] overflow-hidden">
               <div className="absolute inset-0 rounded-full border-4 border-slate-600/30" />
               <div
                className="turbine-rotor flex h-[85%] w-[85%] items-center justify-center rounded-full border border-cyan-300/30 bg-slate-900/90 shadow-inner"
                style={{ '--turbine-speed': `${Math.max(0.5, 4.5 - rotorRatio * 3.8)}s` } as CSSProperties}
              >
                <RotorGlyph className="h-full w-full opacity-80" />
              </div>
            </div>
            <div className="text-center bg-slate-950/80 px-3 py-1 rounded-full border border-slate-800/80 backdrop-blur-sm">
              <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-slate-400">TURBINA LP</div>
              <div className="text-sm sm:text-base font-semibold text-cyan-200">{Math.round(rotorRpm * 0.78).toLocaleString()} rpm</div>
            </div>
          </div>

          {/* Generator */}
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="relative flex h-20 w-20 sm:h-28 sm:w-28 lg:h-36 lg:w-36 items-center justify-center rounded-2xl border-4 border-emerald-900/50 bg-gradient-to-br from-slate-800 to-slate-950 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
              <div className="generator-core relative flex h-[70%] w-[70%] items-center justify-center rounded-xl border border-emerald-400/30 bg-slate-900/90 shadow-inner overflow-hidden">
                {/* Rotating magnetic field effect */}
                <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg,rgba(52,211,153,0.3)_180deg,transparent_360deg)] animate-[spin_2s_linear_infinite]" />
                <span className="relative z-10 h-6 w-6 sm:h-8 sm:w-8 lg:h-12 lg:w-12 rounded-full bg-emerald-300/30 shadow-[0_0_30px_rgba(52,211,153,0.6)]" />
              </div>
            </div>
            <div className="text-center bg-slate-950/80 px-3 py-1 rounded-full border border-slate-800/80 backdrop-blur-sm">
              <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-slate-400">GENERADOR</div>
              <div className="text-sm sm:text-base font-semibold text-emerald-300">{generatorLoad.toFixed(0)}%</div>
            </div>
          </div>
        </div>

        {/* Condenser Return Flow */}
        <div className="absolute inset-x-[15%] bottom-[5%] h-8 overflow-hidden rounded-full border border-slate-800/70 bg-slate-950/80 shadow-inner hidden sm:block">
          {[0, 1, 2].map((stream) => (
            <span
              key={`return-${stream}`}
              className="steam-stream absolute top-[30%] h-3 rounded-full bg-gradient-to-r from-white/0 via-emerald-300/50 to-white/0"
              style={
                {
                  left: '10%',
                  width: `${35 - stream * 10}%`,
                  opacity: clamp(sim.secondaryPumpFlow / 120 - stream * 0.1, 0.1, 0.8),
                  animationDuration: `${2.0 + stream * 0.3}s`,
                  animationDelay: `${stream * 0.2}s`,
                } as CSSProperties
              }
            />
          ))}
          <div className="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-[0.3em] text-slate-500 font-medium">
            RETORNO A CONDENSADOR {sim.secondaryPumpFlow.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="mt-6 grid gap-4 sm:gap-6 sm:grid-cols-3">
        <MetricBar label="Impulso Vapor" valueLabel={`${steamDrive.toFixed(0)}%`} value={steamDrive} fillClassName="bg-gradient-to-r from-cyan-300 via-sky-400 to-white" />
        <MetricBar label="Par Motor (Rotor)" valueLabel={`${(rotorRatio * 100).toFixed(0)}%`} value={rotorRatio * 100} fillClassName="bg-gradient-to-r from-sky-300 to-cyan-400" />
        <MetricBar label="Carga Eléctrica" valueLabel={`${generatorLoad.toFixed(0)}%`} value={generatorLoad} fillClassName="bg-gradient-to-r from-emerald-400 to-lime-400" />
      </div>

      {/* Diagnostic + Acople */}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-[30px] border border-slate-800/70 bg-slate-950/70 p-5 sm:p-6">
          <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500 mb-5">
            Diagnóstico del Tren Secundario
          </div>
          <div className="space-y-4">
            <SystemRow title="Vapor al rotor" icon={Waves} value={`${sim.pressure.toFixed(2)} MPa / ${sim.secondaryPumpFlow.toFixed(0)}% caudal`} status={steamDrive > 70 ? 'pleno' : steamDrive > 35 ? 'medio' : 'bajo'} toneClassName={steamDrive > 70 ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200' : steamDrive > 35 ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-slate-700 bg-slate-900/70 text-slate-300'} />
            <SystemRow title="Generación" icon={Zap} value={`${sim.powerOutput.toFixed(1)} MW / ${sim.thermalPower.toFixed(0)} MWt`} status={sim.powerOutput > 260 ? 'alta' : sim.powerOutput > 120 ? 'nominal' : 'baja'} toneClassName={sim.powerOutput > 260 ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : sim.powerOutput > 120 ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200' : 'border-slate-700 bg-slate-900/70 text-slate-300'} />
            <SystemRow title="Eficiencia" icon={Gauge} value={`${sim.turbineEfficiency.toFixed(1)}% / ${sim.decayHeat.toFixed(0)} MWt residual`} status={sim.turbineEfficiency > 82 ? 'saludable' : sim.turbineEfficiency > 60 ? 'degradando' : 'castigada'} toneClassName={sim.turbineEfficiency > 82 ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : sim.turbineEfficiency > 60 ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-rose-500/30 bg-rose-500/10 text-rose-200'} />
            <SystemRow title="Mercado" icon={Coins} value={`$${Math.round(exportPrice).toLocaleString('es-MX')}/MWh · $${Math.round(revenuePerMinute).toLocaleString('es-MX')}/min`} status={sim.overclockTicks > 0 ? 'pico pagado' : sim.powerOutput > 260 ? 'prima' : 'base'} toneClassName={sim.overclockTicks > 0 ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : sim.powerOutput > 260 ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200' : 'border-slate-700 bg-slate-900/70 text-slate-300'} />
          </div>
        </div>

        <div className="rounded-[30px] border border-slate-800/70 bg-slate-950/70 p-5 sm:p-6">
          <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500 mb-5">
            Acople Reactor-Turbina
          </div>
          <div className="space-y-5">
            <MetricBar label="Potencia Térmica" valueLabel={`${sim.thermalPower.toFixed(0)} MWt`} value={clamp((sim.thermalPower / 1400) * 100, 0, 100)} fillClassName="bg-gradient-to-r from-orange-400 to-amber-400" />
            <MetricBar label="Potencia Eléctrica" valueLabel={`${sim.powerOutput.toFixed(0)} MW`} value={clamp((sim.powerOutput / 520) * 100, 0, 100)} fillClassName="bg-gradient-to-r from-emerald-400 to-lime-400" />
            <MetricBar label="Caudal Secundario" valueLabel={`${sim.secondaryPumpFlow.toFixed(0)}%`} value={sim.secondaryPumpFlow} fillClassName="bg-gradient-to-r from-sky-300 to-cyan-400" />
            <MetricBar label="Ingreso" valueLabel={`$${Math.round(revenuePerMinute).toLocaleString('es-MX')}/min`} value={clamp((revenuePerMinute / 1200) * 100, 0, 100)} fillClassName="bg-gradient-to-r from-emerald-400 via-lime-400 to-yellow-400" />
          </div>
          <div className="mt-6 rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Blend Primario</div>
                <div className="mt-1 text-sm font-semibold text-slate-100">{coolantProfile.label}</div>
              </div>
              <span className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.22em] ${coolantProfile.accent}`}>{coolantProfile.shortLabel}</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">Este blend afecta cuánto calor útil conviertes en caja y cuánto te castiga la presión.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
export function TurbinePage({
  sim,
  alerts,
  onToggleSecondaryPump,
  onSetSteamValve,
  onRepairPump,
  onServiceTurbine,
  onPerformMaintenance,
}: TurbinePageProps) {
  const isGameOver = sim.gameState === 'MELTDOWN' || sim.gameState === 'EXPLOSION';
  const maintenanceWindow = maintenanceWindowOpen(sim);
  const serviceWindow = turbineServiceWindowOpen(sim);
  const exportPrice = computeExportPrice(sim);
  const revenuePerMinute = computeRevenuePerMinute(sim);
  const coolantProfile = getCoolantProfile(sim.coolantProfile);

  return (
    <section className="space-y-6">
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]">
        <TurbineScene sim={sim} />

        <div className="space-y-6">
          <div className="panel-glass rounded-[32px] border border-slate-800/80 p-5">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-slate-400">
              <AlertTriangle className="h-4 w-4 text-cyan-300" />
              Avisos de turbina
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
                  El tren secundario está estable y convierte bien el calor disponible.
                </div>
              )}
            </div>
          </div>

          <div className="panel-glass rounded-[32px] border border-slate-800/80 p-5">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-slate-400">
              <Settings className="h-4 w-4 text-cyan-300" />
              Palancas del secundario
            </div>
            <div className="grid gap-3">
              <div className="rounded-[28px] border border-slate-800/70 bg-slate-950/60 p-4 mb-2">
                <div className="mb-2 flex items-center justify-between gap-4">
                  <label className="text-sm font-medium text-slate-200">
                    Válvula de vapor a turbina
                  </label>
                  <span className="text-right text-xs uppercase tracking-[0.24em] text-slate-500">
                    {sim.steamValve.toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sim.steamValve}
                  onChange={(event) => onSetSteamValve(Number(event.target.value))}
                  disabled={isGameOver}
                  className="control-slider w-full"
                />
                <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.24em] text-slate-500">
                  <span>cerrada</span>
                  <span>abierta (100%)</span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-400">
                  Regula cuánto vapor se admite. Al cerrar, baja la generación pero también reduce la extracción de calor del primario.
                </p>
              </div>

              <button
                onClick={onToggleSecondaryPump}
                disabled={isGameOver}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  sim.secondaryPumpActive
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                    : 'border-slate-800 bg-slate-950/60 text-slate-200 hover:border-slate-700'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em]">
                    <RefreshCw
                      className={`h-4 w-4 ${
                        sim.secondaryPumpActive && sim.secondaryPumpHealth > 0
                          ? 'animate-spin'
                          : ''
                      }`}
                    />
                    Bomba secundaria
                  </div>
                  <span className="text-[10px] text-slate-500 opacity-60">[S]</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Enciende o reduce el caudal útil que alimenta a la turbina.
                </p>
              </button>

              <button
                onClick={() => onRepairPump('secondary')}
                disabled={isGameOver}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-left transition hover:border-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-200">
                  <Wrench className="h-4 w-4 text-cyan-300" />
                  Reparar bomba secundaria
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Recupera la salud del equipo si el tren de vapor empieza a quedarse sin margen.
                </p>
              </button>

              <button
                onClick={onServiceTurbine}
                disabled={isGameOver}
                className={`rounded-2xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  serviceWindow
                    ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-50 hover:bg-cyan-500/15'
                    : 'border-slate-800 bg-slate-950/60 text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em]">
                  <Zap className="h-4 w-4" />
                  Alinear tren secundario
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Mejora eficiencia de turbina y margen de la bomba secundaria, pero requiere carga baja.
                </p>
              </button>

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
                  <Power className="h-4 w-4" />
                  Mantenimiento preventivo integral
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  También recupera turbina, pero exige ventana segura completa del reactor.
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TrendCard
          title="Potencia eléctrica"
          icon={Zap}
          values={sim.history.power}
          value={`${sim.powerOutput.toFixed(1)} MW`}
          subtitle="salida"
          stroke="#34d399"
          fill="#34d399"
          accentClassName="text-emerald-300"
        />
        <TrendCard
          title="Potencia térmica"
          icon={Power}
          values={sim.history.thermalPower}
          value={`${sim.thermalPower.toFixed(0)} MWt`}
          subtitle="entrada"
          stroke="#fb923c"
          fill="#fb923c"
          accentClassName="text-orange-300"
        />
        <TrendCard
          title="Flujo secundario"
          icon={Waves}
          values={sim.history.secondaryFlow}
          value={`${sim.secondaryPumpFlow.toFixed(0)}%`}
          subtitle="caudal"
          stroke="#38bdf8"
          fill="#38bdf8"
          accentClassName="text-cyan-300"
        />
        <TrendCard
          title="Eficiencia"
          icon={Gauge}
          values={sim.history.efficiency}
          value={`${sim.turbineEfficiency.toFixed(1)}%`}
          subtitle="mecánica"
          stroke="#f59e0b"
          fill="#f59e0b"
          accentClassName="text-amber-300"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
        <div className="panel-glass rounded-[32px] border border-slate-800/80 p-5">
          <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-slate-400">
            <Settings className="h-4 w-4 text-cyan-300" />
            Salud del tren de generación
          </div>
          <div className="space-y-4">
            <MetricBar
              label="Bomba secundaria"
              valueLabel={`${sim.secondaryPumpHealth.toFixed(1)}%`}
              value={sim.secondaryPumpHealth}
              fillClassName="bg-gradient-to-r from-emerald-400 to-lime-400"
            />
            <MetricBar
              label="Caudal real"
              valueLabel={`${sim.secondaryPumpFlow.toFixed(0)}%`}
              value={sim.secondaryPumpFlow}
              fillClassName="bg-gradient-to-r from-cyan-300 to-sky-400"
            />
            <MetricBar
              label="Eficiencia de turbina"
              valueLabel={`${sim.turbineEfficiency.toFixed(1)}%`}
              value={sim.turbineEfficiency}
              fillClassName="bg-gradient-to-r from-amber-300 to-orange-400"
            />
            <MetricBar
              label="Carga eléctrica"
              valueLabel={`${sim.powerOutput.toFixed(1)} MW`}
              value={clamp((sim.powerOutput / 520) * 100, 0, 100)}
              fillClassName="bg-gradient-to-r from-emerald-300 to-teal-400"
            />
          </div>
        </div>

        <div className="panel-glass rounded-[32px] border border-slate-800/80 p-5">
          <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-slate-400">
            <Zap className="h-4 w-4 text-cyan-300" />
            Lectura operativa
          </div>
          <div className="space-y-3">
            <SystemRow
              title="Reactor disponible"
              icon={Power}
              value={`${sim.thermalPower.toFixed(0)} MWt / residual ${sim.decayHeat.toFixed(0)} MWt`}
              status={sim.thermalPower > 600 ? 'alto' : sim.thermalPower > 300 ? 'medio' : 'bajo'}
              toneClassName={
                sim.thermalPower > 600
                  ? 'border-orange-500/30 bg-orange-500/10 text-orange-200'
                  : sim.thermalPower > 300
                    ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200'
                    : 'border-slate-700 bg-slate-900/70 text-slate-300'
              }
            />
            <SystemRow
              title="Acople térmico"
              icon={Waves}
              value={`${(
                (sim.powerOutput / Math.max(sim.thermalPower, 1)) *
                100
              ).toFixed(1)}% del calor útil termina en MW eléctricos`}
              status={
                sim.powerOutput / Math.max(sim.thermalPower, 1) > 0.22
                  ? 'aprovechado'
                  : sim.powerOutput / Math.max(sim.thermalPower, 1) > 0.14
                    ? 'intermedio'
                    : 'desacoplado'
              }
              toneClassName={
                sim.powerOutput / Math.max(sim.thermalPower, 1) > 0.22
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                  : sim.powerOutput / Math.max(sim.thermalPower, 1) > 0.14
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
              }
            />
            <SystemRow
              title="Estado del rotor"
              icon={Gauge}
              value={`${sim.turbineEfficiency.toFixed(1)}% / ${sim.secondaryPumpFlow.toFixed(0)}% flujo / ${sim.pressure.toFixed(2)} MPa`}
              status={serviceWindow ? 'listo para intervenir' : 'en carga'}
              toneClassName={
                serviceWindow
                  ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200'
                  : 'border-slate-700 bg-slate-900/70 text-slate-300'
              }
            />
            <SystemRow
              title="Exportación"
              icon={Coins}
              value={`$${Math.round(exportPrice).toLocaleString('es-MX')}/MWh / $${Math.round(revenuePerMinute).toLocaleString('es-MX')}/min / ${coolantProfile.shortLabel}`}
              status={sim.overclockTicks > 0 ? 'pico' : revenuePerMinute > 650 ? 'rentable' : 'base'}
              toneClassName={
                sim.overclockTicks > 0
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                  : revenuePerMinute > 650
                    ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200'
                    : 'border-slate-700 bg-slate-900/70 text-slate-300'
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}
