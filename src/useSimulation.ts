import { useEffect, useRef, useState } from 'react';

import { playScramAlarm, playPumpClick, playAlertSound, playSuccessSound } from './audio';
import {
  LOG_LIMIT,
  OVERCLOCK_COOLDOWN,
  OVERCLOCK_DURATION,
  PRIMARY_PUMP_MAX_DEMAND,
  SHIELD_REPAIR_COST,
  TICK_RATE,
  advanceSimulation,
  clamp,
  cloneState,
  createInitialState,
  deriveFissionState,
  type CoolantProfile,
  getCoolantProfile,
  getOverclockBlockers,
  getMaintenanceBlockers,
  getRefuelBlockers,
  getTurbineServiceBlockers,
  isTerminalState,
  maintenanceWindowOpen,
  refuelWindowOpen,
  turbineServiceWindowOpen,
  type LogLevel,
  type NoticeDraft,
  type NoticeTone,
  type SimulationState,
} from './sim';

export interface NoticeItem extends NoticeDraft {
  id: number;
}

interface ActionHelpers {
  addLog: (level: LogLevel, message: string) => void;
  addNotice: (tone: NoticeTone, title: string, detail: string) => void;
}

const INITIAL_LOG = 'Simulación iniciada. Planta en banda nominal.';

export function useSimulation() {
  const logIdRef = useRef(2);
  const noticeIdRef = useRef(1);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [sim, setSim] = useState<SimulationState>(() => {
    const initialState = createInitialState();

    initialState.logs = [
      {
        id: 1,
        level: 'INFO',
        message: INITIAL_LOG,
        timestamp: new Date().toLocaleTimeString('es-MX', { hour12: false }),
      },
    ];

    return initialState;
  });

  const pushNoticeQueue = (drafts: NoticeDraft[]) => {
    if (drafts.length === 0) return;

    drafts.forEach(n => {
      if (n.tone === 'danger') playAlertSound();
      if (n.tone === 'success') playSuccessSound();
    });

    setNotices((current) => {
      const mapped = drafts.map((draft) => ({
        ...draft,
        id: noticeIdRef.current++,
      }));

      return [...mapped, ...current].slice(0, 4);
    });
  };

  const appendLog = (
    draft: SimulationState,
    level: LogLevel,
    message: string,
  ) => {
    draft.logs = [
      {
        id: logIdRef.current++,
        level,
        message,
        timestamp: new Date().toLocaleTimeString('es-MX', { hour12: false }),
      },
      ...draft.logs,
    ].slice(0, LOG_LIMIT);
  };

  const transact = (
    mutator: (draft: SimulationState, helpers: ActionHelpers) => void,
  ) => {
    const pendingNotices: NoticeDraft[] = [];

    setSim((prev) => {
      if (isTerminalState(prev)) return prev;

      const next = cloneState(prev);
      mutator(next, {
        addLog: (level, message) => appendLog(next, level, message),
        addNotice: (tone, title, detail) =>
          pendingNotices.push({ tone, title, detail }),
      });
      next.fissionState = deriveFissionState(next);

      return next;
    });

    pushNoticeQueue(pendingNotices);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const pendingLogs: Array<{ level: LogLevel; message: string }> = [];
      const pendingNotices: NoticeDraft[] = [];

      setSim((prev) => {
        const next = advanceSimulation(prev, {
          pushLog: (level, message) => pendingLogs.push({ level, message }),
          pushNotice: (notice) => pendingNotices.push(notice),
        });

        if (next === prev) return prev;

        pendingLogs.forEach((entry) => appendLog(next, entry.level, entry.message));
        return next;
      });

      pushNoticeQueue(pendingNotices);
    }, TICK_RATE);

    return () => clearInterval(interval);
  }, []);

  const handleControlRods = (value: number) => {
    transact((draft, helpers) => {
      const wasScrammed = draft.gameState === 'SCRAMMED';
      draft.controlRodsTarget = value;
      draft.gameState = value >= 99 ? 'SCRAMMED' : 'RUNNING';

      if (!wasScrammed && draft.gameState === 'SCRAMMED') {
        helpers.addLog(
          'WARN',
          'Orden de inserción total enviada. Los mecanismos inician parada rápida.',
        );
        helpers.addNotice(
          'warning',
          'Parada rápida solicitada',
          'Las barras van camino al 100% de inserción.',
        );
      }

      if (wasScrammed && draft.gameState === 'RUNNING') {
        helpers.addLog(
          'INFO',
          'Nueva consigna de barras recibida. El arranque será gradual.',
        );
      }
    });
  };

  const togglePrimaryPump = () => {
    let playedAudio = false;
    transact((draft, helpers) => {
      if (!draft.primaryPumpActive && draft.primaryPumpHealth === 0) {
        helpers.addNotice(
          'danger',
          'No se puede arrancar la bomba primaria',
          'La bomba está averiada y necesita reparación antes de volver a servicio.',
        );
        return;
      }

      draft.primaryPumpActive = !draft.primaryPumpActive;
      playedAudio = true;
      helpers.addLog(
        draft.primaryPumpActive ? 'INFO' : 'WARN',
        `Orden a bomba primaria: ${
          draft.primaryPumpActive ? 'acelerar' : 'reducir caudal'
        }.`,
      );
    });
    if (playedAudio) {
      playPumpClick();
    }
  };

  const setPrimaryPumpDemand = (value: number) => {
    transact((draft, helpers) => {
      const nextDemand = clamp(value, 0, PRIMARY_PUMP_MAX_DEMAND);
      const wasOverdriven = draft.primaryPumpDemand > 100;

      draft.primaryPumpDemand = nextDemand;

      if (!wasOverdriven && nextDemand > 100) {
        helpers.addNotice(
          'warning',
          'Primario en sobreimpulso',
          'Más caudal real y más margen térmico, pero con desgaste acelerado en la bomba.',
        );
      }

      if (wasOverdriven && nextDemand <= 100) {
        helpers.addNotice(
          'info',
          'Primario en banda nominal',
          'La bomba volvió a una consigna de desgaste normal.',
        );
      }
    });
  };

  const toggleSecondaryPump = () => {
    let playedAudio = false;
    transact((draft, helpers) => {
      if (!draft.secondaryPumpActive && draft.secondaryPumpHealth === 0) {
        helpers.addNotice(
          'danger',
          'No se puede arrancar la bomba secundaria',
          'La bomba está averiada y necesita reparación antes de volver a servicio.',
        );
        return;
      }

      draft.secondaryPumpActive = !draft.secondaryPumpActive;
      playedAudio = true;
      helpers.addLog(
        draft.secondaryPumpActive ? 'INFO' : 'WARN',
        `Orden a bomba secundaria: ${
          draft.secondaryPumpActive ? 'acelerar' : 'reducir caudal'
        }.`,
      );
    });
    if (playedAudio) {
      playPumpClick();
    }
  };

  const togglePurgeValve = () => {
    transact((draft, helpers) => {
      draft.purgeValveOpen = !draft.purgeValveOpen;
      helpers.addLog(
        draft.purgeValveOpen ? 'WARN' : 'INFO',
        `Válvula de purga ${draft.purgeValveOpen ? 'abierta' : 'cerrada'}.`,
      );
      helpers.addNotice(
        draft.purgeValveOpen ? 'warning' : 'info',
        `Purga ${draft.purgeValveOpen ? 'abierta' : 'cerrada'}`,
        draft.purgeValveOpen
          ? 'Reducirá presión, pero también inventario y radiación de fondo.'
          : 'El alivio de presión volvió a modo conservador.',
      );
    });
  };

  const toggleContainmentSpray = () => {
    transact((draft, helpers) => {
      draft.containmentSprayActive = !draft.containmentSprayActive;
      helpers.addLog(
        draft.containmentSprayActive ? 'WARN' : 'INFO',
        `Spray de contención ${
          draft.containmentSprayActive ? 'activo' : 'desactivado'
        }.`,
      );
      helpers.addNotice(
        draft.containmentSprayActive ? 'info' : 'info',
        `Spray ${draft.containmentSprayActive ? 'activado' : 'desactivado'}`,
        draft.containmentSprayActive
          ? 'Usa reserva auxiliar de contención para bajar presión y radiación.'
          : 'La reserva auxiliar queda conservada para futuras maniobras.',
      );
    });
  };

  const injectBoron = () => {
    const cost = 1200;

    transact((draft, helpers) => {
      if (draft.funds < cost) {
        helpers.addNotice(
          'warning',
          'Fondos insuficientes',
          'La inyección de boro cuesta $1,200.',
        );
        return;
      }
      if (draft.boronLevel >= 90) {
        helpers.addNotice(
          'info',
          'Reserva de boro alta',
          'No hace falta inyectar más boro en este momento.',
        );
        return;
      }

      draft.funds -= cost;
      draft.boronLevel = clamp(draft.boronLevel + 18, 0, 100);
      helpers.addLog(
        'WARN',
        'Inyección de boro realizada. Reactividad en descenso.',
      );
      helpers.addNotice(
        'success',
        'Boro inyectado',
        'La reserva de boro subió y la reactividad tenderá a bajar.',
      );
    });
  };

  const setCoolantProfile = (profile: CoolantProfile) => {
    const cost = 650;

    transact((draft, helpers) => {
      if (draft.coolantProfile === profile) {
        helpers.addNotice(
          'info',
          'Blend ya activo',
          'El circuito ya está corriendo con ese perfil de refrigerante.',
        );
        return;
      }
      if (draft.funds < cost) {
        helpers.addNotice(
          'warning',
          'Fondos insuficientes',
          'Cambiar el blend del refrigerante cuesta $650.',
        );
        return;
      }

      draft.funds -= cost;
      draft.coolantProfile = profile;
      draft.coolantLevel = 100;
      const profileLabel = getCoolantProfile(profile).label;
      helpers.addLog(
        'INFO',
        `Cambio de blend completado. El circuito primario ahora opera en modo ${profileLabel}.`,
      );
      helpers.addNotice(
        'success',
        'Blend de refrigerante actualizado',
        'El make-up y la química automática reconfiguraron el circuito a la nueva mezcla.',
      );
    });
  };

  const repairPump = (type: 'primary' | 'secondary') => {
    const cost = 2000;

    transact((draft, helpers) => {
      const health =
        type === 'primary' ? draft.primaryPumpHealth : draft.secondaryPumpHealth;

      if (draft.funds < cost) {
        helpers.addNotice(
          'warning',
          'Fondos insuficientes',
          'La reparación de bomba cuesta $2,000.',
        );
        return;
      }
      if (health === 100) {
        helpers.addNotice(
          'info',
          'Bomba ya disponible',
          'La bomba seleccionada no necesita reparación.',
        );
        return;
      }

      draft.funds -= cost;
      if (type === 'primary') {
        draft.primaryPumpHealth = 100;
      } else {
        draft.secondaryPumpHealth = 100;
      }

      helpers.addLog(
        'INFO',
        `Bomba ${type === 'primary' ? 'primaria' : 'secundaria'} reparada.`,
      );
      helpers.addNotice(
        'success',
        `Bomba ${type === 'primary' ? 'primaria' : 'secundaria'} reparada`,
        'La salud del equipo volvió al 100%.',
      );
    });
  };

  const serviceTurbine = () => {
    const cost = 1800;

    transact((draft, helpers) => {
      if (draft.funds < cost) {
        helpers.addNotice(
          'warning',
          'Fondos insuficientes',
          'La intervención del tren secundario cuesta $1,800.',
        );
        return;
      }
      if (draft.turbineEfficiency >= 100) {
        helpers.addNotice(
          'info',
          'Turbina en mejor estado',
          'No hay margen para recuperar más eficiencia.',
        );
        return;
      }
      if (!turbineServiceWindowOpen(draft)) {
        helpers.addNotice(
          'warning',
          'Carga demasiado alta para intervenir la turbina',
          `Baja la carga: ${getTurbineServiceBlockers(draft).join(', ')}.`,
        );
        return;
      }

      draft.funds -= cost;
      draft.turbineEfficiency = clamp(draft.turbineEfficiency + 16, 0, 100);
      draft.secondaryPumpHealth = clamp(draft.secondaryPumpHealth + 8, 0, 100);
      helpers.addLog(
        'INFO',
        'Alineación y limpieza del tren secundario completadas.',
      );
      helpers.addNotice(
        'success',
        'Tren secundario reajustado',
        'La eficiencia de turbina y el margen de la bomba secundaria mejoraron.',
      );
    });
  };

  const performMaintenance = () => {
    const cost = 3500;

    transact((draft, helpers) => {
      if (draft.funds < cost) {
        helpers.addNotice(
          'warning',
          'Fondos insuficientes',
          'El mantenimiento preventivo cuesta $3,500.',
        );
        return;
      }
      if (!maintenanceWindowOpen(draft)) {
        helpers.addNotice(
          'warning',
          'Ventana de mantenimiento bloqueada',
          `No se puede intervenir porque ${getMaintenanceBlockers(draft).join(', ')}.`,
        );
        return;
      }

      draft.funds -= cost;
      draft.primaryPumpHealth = clamp(draft.primaryPumpHealth + 22, 0, 100);
      draft.secondaryPumpHealth = clamp(draft.secondaryPumpHealth + 22, 0, 100);
      draft.turbineEfficiency = clamp(draft.turbineEfficiency + 14, 0, 100);
      draft.containmentIntegrity = clamp(
        draft.containmentIntegrity + 8,
        0,
        100,
      );
      draft.chemistryBalance = clamp(draft.chemistryBalance + 12, 0, 100);
      draft.coreDamage = clamp(draft.coreDamage - 8, 0, 100);
      helpers.addLog(
        'INFO',
        'Mantenimiento preventivo completado en tren primario y turbina.',
      );
      helpers.addNotice(
        'success',
        'Mantenimiento completado',
        'La planta recuperó margen operativo en bombas, química, turbina y contención.',
      );
    });
  };

  const refuel = () => {
    const cost = 15000;

    transact((draft, helpers) => {
      if (draft.funds < cost) {
        helpers.addNotice(
          'warning',
          'Fondos insuficientes',
          'La recarga de combustible cuesta $15,000.',
        );
        return;
      }
      if (!refuelWindowOpen(draft)) {
        helpers.addNotice(
          'warning',
          'Recarga bloqueada',
          `No es seguro recargar todavía porque ${getRefuelBlockers(draft).join(', ')}.`,
        );
        return;
      }

      draft.funds -= cost;
      draft.fuelLevel = 100;
      draft.boronLevel = clamp(draft.boronLevel + 10, 0, 100);
      draft.coreDamage = clamp(draft.coreDamage - 15, 0, 100);
      helpers.addLog('INFO', 'Recarga de combustible completada.');
      helpers.addNotice(
        'success',
        'Recarga completada',
        'El combustible volvió al 100% y el núcleo recuperó parte del margen.',
      );
    });
  };

  const scram = () => {
    transact((draft, helpers) => {
      draft.controlRodsTarget = 100;
      draft.gameState = 'SCRAMMED';
      helpers.addLog(
        'CRITICAL',
        'SCRAM iniciado. Inserción total de barras en curso.',
      );
      helpers.addNotice(
        'danger',
        'SCRAM iniciado',
        'Se ordenó inserción total de barras. Vigila calor residual, presión y agua.',
      );
    });
    playScramAlarm();
  };

  const triggerOverclock = () => {
    transact((draft, helpers) => {
      const blockers = getOverclockBlockers(draft);

      if (blockers.length > 0) {
        helpers.addNotice(
          'warning',
          'Overclock bloqueado',
          `No es seguro activarlo porque ${blockers.join(', ')}.`,
        );
        return;
      }

      draft.overclockTicks = OVERCLOCK_DURATION;
      draft.overclockCooldown = OVERCLOCK_COOLDOWN;
      draft.primaryPumpDemand = clamp(
        Math.max(draft.primaryPumpDemand, 106),
        0,
        PRIMARY_PUMP_MAX_DEMAND,
      );
      helpers.addLog(
        'CRITICAL',
        'Overclock térmico activado. El reactor entra en un pulso breve de potencia máxima.',
      );
      helpers.addNotice(
        'danger',
        'Overclock activo',
        'Subirá MW durante unos segundos, pero también presión, radiación y desgaste del primario.',
      );
    });
  };

  const toggleRadiationShield = (zone: number) => {
    transact((draft, helpers) => {
      if (zone < 0 || zone > 3) return;
      draft.radiationShields[zone] = !draft.radiationShields[zone];
      const zoneNames = ['Anillo superior', 'Blindaje oeste', 'Canal de vapor', 'Edificio de turbina'];
      const state = draft.radiationShields[zone] ? 'activado' : 'desactivado';
      helpers.addLog(
        draft.radiationShields[zone] ? 'INFO' : 'WARN',
        `Escudo de blindaje ${zoneNames[zone]} ${state}.`,
      );
      helpers.addNotice(
        draft.radiationShields[zone] ? 'info' : 'info',
        `Blindaje ${state}`,
        draft.radiationShields[zone]
          ? `Zona ${zoneNames[zone]} protegida. Costo: $80/s. La radiación bloqueada se redistribuirá a zonas sin escudo.`
          : `Zona ${zoneNames[zone]} expuesta. Ya no consume fondos por blindaje.`,
      );
    });
  };

  const repairShields = () => {
    transact((draft, helpers) => {
      if (draft.funds < SHIELD_REPAIR_COST) {
        helpers.addNotice(
          'warning',
          'Fondos insuficientes',
          `La reparación de blindaje cuesta $${SHIELD_REPAIR_COST.toLocaleString('es-MX')}.`,
        );
        return;
      }

      const avgEff = draft.shieldEfficiency.reduce((s, e) => s + e, 0) / 4;
      if (avgEff >= 95) {
        helpers.addNotice(
          'info',
          'Blindaje en buen estado',
          'Los escudos todavía están en buena condición.',
        );
        return;
      }

      draft.funds -= SHIELD_REPAIR_COST;
      draft.shieldEfficiency = [100, 100, 100, 100];
      helpers.addLog('INFO', 'Reparación de blindaje completada. Los 4 escudos vuelven al 100%.');
      helpers.addNotice(
        'success',
        'Blindaje reparado',
        'Todos los escudos de zona vuelven a eficiencia máxima.',
      );
    });
  };

  const restartSimulation = () => {
    logIdRef.current = 2;
    noticeIdRef.current = 1;
    setNotices([]);
    setSim(() => {
      const initialState = createInitialState();

      initialState.logs = [
        {
          id: 1,
          level: 'INFO',
          message: INITIAL_LOG,
          timestamp: new Date().toLocaleTimeString('es-MX', { hour12: false }),
        },
      ];

      return initialState;
    });
  };

  const toggleMakeupPump = () => {
    transact((draft, helpers) => {
      draft.makeupPumpRunning = !draft.makeupPumpRunning;
      helpers.addLog('INFO', `Bomba de Make-Up ${draft.makeupPumpRunning ? 'activada' : 'desactivada'}.`);
    });
  };

  const setSteamValve = (value: number) => {
    transact((draft, helpers) => {
      draft.steamValve = clamp(value, 0, 100);
    });
  };

  const triggerLeak = () => {
    transact((draft, helpers) => {
      draft.coolantLeakRate = draft.coolantLeakRate > 0 ? 0 : 2.5;
      if (draft.coolantLeakRate > 0) {
        helpers.addLog('CRITICAL', '¡Fuga de refrigerante detectada! (LOCA)');
        helpers.addNotice('danger', 'Fuga de Refrigerante', 'El nivel del primario está cayendo. Activa el Make-Up.');
      } else {
        helpers.addLog('INFO', 'Fuga de refrigerante sellada.');
        helpers.addNotice('success', 'Fuga sellada', 'El circuito primario vuelve a estar estanco.');
      }
    });
  };

  const dismissNotice = (id: number) => {
    setNotices((current) => current.filter((notice) => notice.id !== id));
  };

  const buyUpgrade = (upgradeId: keyof SimulationState['upgrades']) => {
    const costs: Record<keyof SimulationState['upgrades'], number> = {
      fastRods: 8000,
      heavyPumps: 12000,
      betterInsulation: 10000,
    };
    
    transact((draft, helpers) => {
      const cost = costs[upgradeId];
      if (draft.upgrades[upgradeId]) {
         helpers.addNotice('info', 'Mejora ya adquirida', 'Ya tienes esta mejora instalada.');
         return;
      }
      if (draft.funds < cost) {
         helpers.addNotice('warning', 'Fondos insuficientes', `Esta mejora cuesta $${cost.toLocaleString('es-MX')}.`);
         return;
      }
      
      draft.funds -= cost;
      draft.upgrades[upgradeId] = true;
      helpers.addLog('INFO', `Mejora adquirida: ${String(upgradeId)}.`);
      helpers.addNotice('success', 'Mejora instalada', 'La mejora ya está operativa en la planta.');
    });
  };

  return {
    sim,
    notices,
    dismissNotice,
    actions: {
      handleControlRods,
      togglePrimaryPump,
      setPrimaryPumpDemand,
      toggleSecondaryPump,
      togglePurgeValve,
      toggleContainmentSpray,
      toggleMakeupPump,
      setSteamValve,
      triggerLeak,
      injectBoron,
      setCoolantProfile,
      repairPump,
      serviceTurbine,
      performMaintenance,
      refuel,
      scram,
      triggerOverclock,
      toggleRadiationShield,
      repairShields,
      restartSimulation,
      buyUpgrade,
    },
  };
}
