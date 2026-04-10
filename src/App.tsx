import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpenText,
  Radio,
  Radiation,
  SplitSquareVertical,
  Waves,
  Zap,
} from 'lucide-react';

import { ReactorPage } from './components/ReactorPage';
import { TurbinePage } from './components/TurbinePage';
import {
  GameOverModal,
  GuideDrawer,
  HeaderStat,
  MonitorSidebar,
  NoticeRail,
  getFissionToneClass,
  getStatusColorClass,
} from './components/shared';
import {
  GUIDE_TOPICS,
  buildAlerts,
  buildDetectors,
  buildRecommendations,
  computeRiskIndex,
  formatCurrency,
  formatRadiation,
  isCleanPlant,
  type SimView,
} from './sim';
import { useSimulation } from './useSimulation';

const VIEW_HASHES: Record<SimView, string> = {
  reactor: '#/reactor',
  turbine: '#/turbina',
};

const getViewFromHash = (hash: string): SimView =>
  hash.includes('turbina') ? 'turbine' : 'reactor';

export default function App() {
  const { sim, notices, dismissNotice, actions } = useSimulation();
  const [guideOpen, setGuideOpen] = useState(false);
  const [activeGuideId, setActiveGuideId] = useState('fission');
  const [activeView, setActiveView] = useState<SimView>(() =>
    getViewFromHash(window.location.hash),
  );

  useEffect(() => {
    const handleHashChange = () => {
      setActiveView(getViewFromHash(window.location.hash));
    };

    window.addEventListener('hashchange', handleHashChange);
    if (!window.location.hash) {
      window.history.replaceState(null, '', VIEW_HASHES.reactor);
    }

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const changeView = (view: SimView) => {
    setActiveView(view);
    window.history.replaceState(null, '', VIEW_HASHES[view]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const riskIndex = useMemo(() => computeRiskIndex(sim), [sim]);
  const recommendations = useMemo(() => buildRecommendations(sim), [sim]);
  const alerts = useMemo(() => buildAlerts(sim), [sim]);
  const detectors = useMemo(() => buildDetectors(sim), [sim]);
  const cleanPlant = useMemo(() => isCleanPlant(detectors), [detectors]);
  const maintenanceWindow =
    sim.coreTemp < 160 && sim.pressure < 13.5 && sim.controlRods > 90;
  const isGameOver =
    sim.gameState === 'MELTDOWN' || sim.gameState === 'EXPLOSION';

  // Radiation glow class
  const radGlowClass = sim.radiationLevel > 60
    ? 'rad-glow-red'
    : sim.radiationLevel > 20
      ? 'rad-glow-amber'
      : 'rad-glow-green';

  const reactorAlerts = alerts.filter(
    (alert) => alert.area === 'reactor' || alert.area === 'shared',
  );
  const turbineAlerts = alerts.filter(
    (alert) => alert.area === 'turbine' || alert.area === 'shared',
  );

  const pageTitle =
    activeView === 'reactor'
      ? 'Página del reactor'
      : 'Página de la turbina';
  const pageSubtitle =
    activeView === 'reactor'
      ? 'Operación del núcleo, contención, agua, química y detectores.'
      : 'Conversión térmica a potencia eléctrica, rotor, generador y secundario.';

  return (
    <div className="min-h-screen bg-transparent px-4 py-5 text-slate-100 md:px-6 xl:px-8">
      {/* Floating background particles */}
      {[...Array(8)].map((_, i) => (
        <div
          key={`particle-${i}`}
          className="bg-particle"
          style={{
            width: `${2 + (i % 3)}px`,
            height: `${2 + (i % 3)}px`,
            left: `${10 + i * 11}%`,
            top: `${60 + (i % 4) * 20}%`,
            background: sim.radiationLevel > 40
              ? `rgba(244, 63, 94, ${0.12 + (i % 3) * 0.06})`
              : `rgba(34, 211, 238, ${0.1 + (i % 3) * 0.05})`,
            '--particle-duration': `${16 + i * 3}s`,
            '--particle-opacity': `${0.08 + (i % 3) * 0.06}`,
            animationDelay: `${i * 2.5}s`,
          } as React.CSSProperties}
        />
      ))}

      <div className="relative z-10 mx-auto max-w-[1680px] space-y-6">
        <header className="panel-glass rounded-[34px] border border-slate-800/80 px-5 py-5 md:px-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 shadow-[0_0_30px_rgba(34,211,238,0.18)]">
                <Radio className="h-7 w-7 text-cyan-300" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.4em] text-slate-500">
                  PWR Sim-OS v4.0
                </div>
                <h1 className="mt-1 text-2xl font-semibold tracking-[0.12em] text-slate-50 md:text-3xl">
                  Consola modular de reactor presurizado
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-400">
                  La planta ahora separa Reactor y Turbina en páginas distintas. La lógica del secundario quedó desacoplada del enfriamiento del núcleo y los avisos se muestran con más contexto operativo.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
              <HeaderStat
                label="Estado"
                value={sim.gameState}
                toneClassName={
                  sim.gameState === 'RUNNING'
                    ? 'text-emerald-300'
                    : sim.gameState === 'SCRAMMED'
                      ? 'text-amber-300'
                      : 'text-rose-300'
                }
              />
              <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                  Fisión
                </div>
                <div
                  className={`mt-2 inline-flex max-w-full items-center justify-center rounded-full border px-3 py-1 text-center text-xs uppercase tracking-[0.24em] ${getFissionToneClass(
                    sim.fissionState,
                  )}`}
                >
                  {sim.fissionState}
                </div>
              </div>
              <HeaderStat
                label="Potencia"
                value={`${sim.powerOutput.toFixed(1)} MW`}
                toneClassName="text-cyan-300"
              />
              <HeaderStat
                label="Riesgo"
                value={`${riskIndex.toFixed(0)}%`}
                toneClassName={getStatusColorClass(riskIndex, 45, 75)}
              />
              <div className={`rounded-2xl border border-slate-800/70 bg-slate-950/60 px-4 py-3 ${radGlowClass}`}>
                <div className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                  Radiación
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Radiation className={`h-4 w-4 ${
                    sim.radiationLevel > 60 ? 'text-rose-300' :
                    sim.radiationLevel > 20 ? 'text-amber-300' : 'text-emerald-300'
                  }`} />
                  <span className={`text-lg font-semibold font-mono ${
                    sim.radiationLevel > 60 ? 'text-rose-300' :
                    sim.radiationLevel > 20 ? 'text-amber-300' : 'text-emerald-300'
                  }`}>
                    {formatRadiation(sim.radiationLevel)}
                  </span>
                </div>
                {cleanPlant && (
                  <div className="mt-1 text-[9px] uppercase tracking-[0.22em] text-emerald-400">
                    ✦ planta limpia
                  </div>
                )}
              </div>
              <HeaderStat
                label="Fondos"
                value={formatCurrency(sim.funds)}
                toneClassName="text-emerald-300"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-4 border-t border-slate-800/70 pt-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
              <span className="rounded-full border border-slate-800/70 bg-slate-950/70 px-3 py-1">
                barras objetivo {sim.controlRodsTarget.toFixed(0)}%
              </span>
              <span className="rounded-full border border-slate-800/70 bg-slate-950/70 px-3 py-1">
                barras reales {sim.controlRods.toFixed(0)}%
              </span>
              <span className="rounded-full border border-slate-800/70 bg-slate-950/70 px-3 py-1">
                térmica {sim.thermalPower.toFixed(0)} MWt
              </span>
              <span className="rounded-full border border-slate-800/70 bg-slate-950/70 px-3 py-1">
                calor residual {sim.decayHeat.toFixed(0)} MWt
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setGuideOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/15"
              >
                <BookOpenText className="h-4 w-4" />
                Guía del operador
              </button>
              <button
                onClick={actions.restartSimulation}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-700 hover:bg-slate-900/70"
              >
                <SplitSquareVertical className="h-4 w-4 text-cyan-300" />
                Reiniciar
              </button>
            </div>
          </div>
        </header>

        <NoticeRail notices={notices} dismissNotice={dismissNotice} />

        <nav className="panel-glass sticky top-4 z-20 rounded-[30px] border border-slate-800/80 px-4 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid gap-3 md:grid-cols-2">
              <button
                onClick={() => changeView('reactor')}
                className={`rounded-[24px] border px-4 py-4 text-left transition ${
                  activeView === 'reactor'
                    ? 'border-cyan-500/35 bg-cyan-500/10 text-cyan-50'
                    : 'border-slate-800/80 bg-slate-950/60 text-slate-200 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.26em] text-slate-400">
                  <Radio className="h-4 w-4 text-cyan-300" />
                  Reactor
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  Núcleo, contención, detectores y maniobras primarias.
                </p>
              </button>

              <button
                onClick={() => changeView('turbine')}
                className={`rounded-[24px] border px-4 py-4 text-left transition ${
                  activeView === 'turbine'
                    ? 'border-cyan-500/35 bg-cyan-500/10 text-cyan-50'
                    : 'border-slate-800/80 bg-slate-950/60 text-slate-200 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.26em] text-slate-400">
                  <Zap className="h-4 w-4 text-cyan-300" />
                  Turbina
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  Rotor, generador, secundario y aprovechamiento del calor útil.
                </p>
              </button>
            </div>

            <div className="rounded-[24px] border border-slate-800/70 bg-slate-950/70 px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.26em] text-slate-500">
                {pageTitle}
              </div>
              <p className="mt-2 max-w-md text-sm text-slate-300">{pageSubtitle}</p>
            </div>
          </div>
        </nav>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <main className="min-w-0">
            {activeView === 'reactor' ? (
              <ReactorPage
                sim={sim}
                alerts={reactorAlerts}
                onControlRods={actions.handleControlRods}
                onTogglePrimaryPump={actions.togglePrimaryPump}
                onSetPrimaryPumpDemand={actions.setPrimaryPumpDemand}
                onTogglePurgeValve={actions.togglePurgeValve}
                onToggleContainmentSpray={actions.toggleContainmentSpray}
                onToggleMakeupPump={actions.toggleMakeupPump}
                onTriggerLeak={actions.triggerLeak}
                onInjectBoron={actions.injectBoron}                onSetCoolantProfile={actions.setCoolantProfile}
                onRepairPump={actions.repairPump}
                onPerformMaintenance={actions.performMaintenance}
                onRefuel={actions.refuel}
                onScram={actions.scram}
                onTriggerOverclock={actions.triggerOverclock}
                onToggleRadiationShield={actions.toggleRadiationShield}
                onRepairShields={actions.repairShields}
              />
            ) : (
              <TurbinePage
                sim={sim}
                alerts={turbineAlerts}
                onToggleSecondaryPump={actions.toggleSecondaryPump}
                onSetSteamValve={actions.setSteamValve}
                onRepairPump={actions.repairPump}                onServiceTurbine={actions.serviceTurbine}
                onPerformMaintenance={actions.performMaintenance}
              />
            )}
          </main>

          <MonitorSidebar
            sim={sim}
            alerts={alerts}
            recommendations={recommendations}
            maintenanceWindow={maintenanceWindow}
            onBuyUpgrade={actions.buyUpgrade}
          />
        </div>
      </div>

      <GuideDrawer
        open={guideOpen}
        topics={GUIDE_TOPICS}
        activeGuideId={activeGuideId}
        onSelectTopic={setActiveGuideId}
        onClose={() => setGuideOpen(false)}
        sim={sim}
        maintenanceWindow={maintenanceWindow}
      />

      <GameOverModal
        sim={sim}
        open={isGameOver}
        onRestart={actions.restartSimulation}
      />
    </div>
  );
}
