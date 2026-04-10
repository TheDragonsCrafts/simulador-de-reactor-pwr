import {
  TICK_RATE,
  MAX_TEMP,
  WARNING_TEMP,
  MAX_PRESSURE,
  WARNING_PRESSURE,
  HISTORY_POINTS,
  LOG_LIMIT,
  PRIMARY_PUMP_MAX_DEMAND,
  OVERCLOCK_DURATION,
  OVERCLOCK_COOLDOWN,
} from './config/physicsConstants';

export {
  TICK_RATE,
  MAX_TEMP,
  WARNING_TEMP,
  MAX_PRESSURE,
  WARNING_PRESSURE,
  HISTORY_POINTS,
  LOG_LIMIT,
  PRIMARY_PUMP_MAX_DEMAND,
  OVERCLOCK_DURATION,
  OVERCLOCK_COOLDOWN,
};

export type GameState = 'RUNNING' | 'SCRAMMED' | 'MELTDOWN' | 'EXPLOSION';
export type SimView = 'reactor' | 'turbine';
export type LogLevel = 'INFO' | 'WARN' | 'DANGER' | 'CRITICAL';
export type NoticeTone = 'info' | 'success' | 'warning' | 'danger';
export type AlertSeverity = 'warning' | 'danger' | 'critical';
export type CoolantProfile = 'balanced' | 'turbosteam' | 'shieldx' | 'boronx';
export type FissionState =
  | 'Subcritica'
  | 'Critica estable'
  | 'Carga media'
  | 'Potencia alta'
  | 'Transitorio severo'
  | 'SCRAM'
  | 'Fusion';

export interface LogEntry {
  id: number;
  level: LogLevel;
  message: string;
  timestamp: string;
}

export interface TrendHistory {
  temp: number[];
  pressure: number[];
  radiation: number[];
  power: number[];
  coolant: number[];
  reactivity: number[];
  primaryFlow: number[];
  secondaryFlow: number[];
  efficiency: number[];
  thermalPower: number[];
}

export interface CoolantProfileSpec {
  id: CoolantProfile;
  label: string;
  shortLabel: string;
  accent: string;
  description: string;
  effects: string[];
  chemistryTarget: number;
  coolingFactor: number;
  pressureFactor: number;
  radiationFactor: number;
  powerFactor: number;
  reactivityBias: number;
  overclockFactor: number;
  upkeepPerTick: number;
}

export interface UpgradesState {
  heavyPumps: boolean;
  fastRods: boolean;
  betterInsulation: boolean;
}

export interface SimulationState {
  coreTemp: number;
  coreDamage: number;
  pressure: number;
  controlRods: number;
  controlRodsTarget: number;
  coolantLevel: number;
  primaryPumpActive: boolean;
  primaryPumpHealth: number;
  primaryPumpFlow: number;
  primaryPumpDemand: number;
  secondaryPumpActive: boolean;
  secondaryPumpHealth: number;
  secondaryPumpFlow: number;
  fuelLevel: number;
  containmentIntegrity: number;
  powerOutput: number;
  thermalPower: number;
  decayHeat: number;
  energyGenerated: number;
  funds: number;
  gameState: GameState;
  logs: LogEntry[];
  radiationLevel: number;
  neutronFlux: number;
  boronLevel: number;
  chemistryBalance: number;
  sprayReserve: number;
  coolantProfile: CoolantProfile;
  purgeValveOpen: boolean;
  purgeOpenSeconds: number;
  containmentSprayActive: boolean;
  sprayActiveSeconds: number;
  turbineEfficiency: number;
  steamVoids: number;
  reactivity: number;
  xenonPoisoning: number;
  iodinePoison: number;
  makeupPumpRunning: boolean;
  coolantLeakRate: number;
  steamValve: number;
  overclockTicks: number;
  overclockCooldown: number;
  fissionState: FissionState;
  radiationShields: boolean[];
  shieldEfficiency: number[];
  shieldActiveSeconds: number[];
  history: TrendHistory;
  marketDemand: number;
  marketPrice: number;
  upgrades: UpgradesState;
}

export interface DetectorReading {
  label: string;
  zone: string;
  value: number;
}

export interface GuideTopic {
  id: string;
  title: string;
  summary: string;
  whyItMatters: string;
  howItWorks: string[];
  whatRaisesIt: string[];
  whatLowersIt: string[];
  operatorChecklist: string[];
}

export interface AlertItem {
  id: string;
  area: 'reactor' | 'turbine' | 'shared';
  severity: AlertSeverity;
  title: string;
  detail: string;
}

export interface NoticeDraft {
  tone: NoticeTone;
  title: string;
  detail: string;
}

export interface StepContext {
  pushLog: (level: LogLevel, message: string) => void;
  pushNotice: (notice: NoticeDraft) => void;
}

const buildSeed = (value: number) => Array.from({ length: HISTORY_POINTS }, () => value);

export const COOLANT_PROFILES: CoolantProfileSpec[] = [
  {
    id: 'balanced',
    label: 'Agua balanceada',
    shortLabel: 'Balance',
    accent: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100',
    description:
      'Programa estándar del circuito. La estación automática mantiene inventario y química en banda nominal.',
    effects: ['estable', '+control térmico', '+química automática'],
    chemistryTarget: 96,
    coolingFactor: 1,
    pressureFactor: 1,
    radiationFactor: 1,
    powerFactor: 1,
    reactivityBias: 0,
    overclockFactor: 1,
    upkeepPerTick: 0.02,
  },
  {
    id: 'turbosteam',
    label: 'Mix TurboSteam',
    shortLabel: 'Turbo',
    accent: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
    description:
      'Aditivo para transferencia agresiva. Empuja más MW y hace que el overclock pegue más fuerte, a cambio de más presión.',
    effects: ['++MW', '+overclock', '+presión'],
    chemistryTarget: 92,
    coolingFactor: 1.06,
    pressureFactor: 1.12,
    radiationFactor: 1.04,
    powerFactor: 1.18,
    reactivityBias: 0.02,
    overclockFactor: 1.22,
    upkeepPerTick: 0.06,
  },
  {
    id: 'shieldx',
    label: 'Mix Shield-X',
    shortLabel: 'Shield',
    accent: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
    description:
      'Blend denso y muy dócil. Baja radiación y presión, ideal para estabilizar, pero sacrifica parte del pico eléctrico.',
    effects: ['-radiación', '-presión', '-MW pico'],
    chemistryTarget: 99,
    coolingFactor: 1.04,
    pressureFactor: 0.9,
    radiationFactor: 0.72,
    powerFactor: 0.94,
    reactivityBias: -0.015,
    overclockFactor: 0.86,
    upkeepPerTick: 0.05,
  },
  {
    id: 'boronx',
    label: 'Mix Boron-X',
    shortLabel: 'Boron-X',
    accent: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-100',
    description:
      'Circuito preamortiguado para carga segura. Mata picos de reactividad y ayuda al shutdown, con menor conversión a MW.',
    effects: ['-reactividad', '+shutdown', '-potencia'],
    chemistryTarget: 98,
    coolingFactor: 1.02,
    pressureFactor: 0.95,
    radiationFactor: 0.84,
    powerFactor: 0.92,
    reactivityBias: -0.03,
    overclockFactor: 0.9,
    upkeepPerTick: 0.04,
  },
];

export const getCoolantProfile = (profile: CoolantProfile) =>
  COOLANT_PROFILES.find((item) => item.id === profile) ?? COOLANT_PROFILES[0];

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const pushHistory = (series: number[], value: number) => [
  ...series.slice(-(HISTORY_POINTS - 1)),
  value,
];

export const isTerminalState = (state: SimulationState) =>
  state.gameState === 'MELTDOWN' || state.gameState === 'EXPLOSION';

export const formatCurrency = (value: number) =>
  `$${Math.floor(value).toLocaleString('es-MX')}`;

export const formatRadiation = (value: number) =>
  value < 1 ? `${Math.round(value * 1000)} uSv/h` : `${value.toFixed(1)} mSv/h`;

export const computeExportPrice = (state: SimulationState) => {
  const coolant = getCoolantProfile(state.coolantProfile);

  let price = state.marketPrice;
  if (state.powerOutput > 240) price += 16;
  if (state.powerOutput > 340) price += 18;
  if (state.turbineEfficiency > 88) price += 14;
  if (state.overclockTicks > 0) price += 38;
  if (coolant.id === 'turbosteam') price += 12;
  if (coolant.id === 'shieldx') price -= 8;

  // Clean plant bonus: all detectors below threshold
  const detectors = buildDetectors(state);
  if (isCleanPlant(detectors)) price += CLEAN_PLANT_BONUS;

  return price;
};

export const computeRevenuePerMinute = (state: SimulationState) =>
  (state.powerOutput / 60) * computeExportPrice(state);

export const cloneState = (state: SimulationState): SimulationState => ({
  ...state,
  logs: [...state.logs],
  radiationShields: [...state.radiationShields],
  shieldEfficiency: [...state.shieldEfficiency],
  shieldActiveSeconds: [...state.shieldActiveSeconds],
  upgrades: { ...state.upgrades },
  history: {
    temp: [...state.history.temp],
    pressure: [...state.history.pressure],
    radiation: [...state.history.radiation],
    power: [...state.history.power],
    coolant: [...state.history.coolant],
    reactivity: [...state.history.reactivity],
    primaryFlow: [...state.history.primaryFlow],
    secondaryFlow: [...state.history.secondaryFlow],
    efficiency: [...state.history.efficiency],
    thermalPower: [...state.history.thermalPower],
  },
});

import {
  SHIELD_COST_PER_TICK,
  SHIELD_REPAIR_COST,
  SHIELD_MAX_REDUCTION,
  SHIELD_REDISTRIBUTION,
  CLEAN_PLANT_THRESHOLD,
  CLEAN_PLANT_BONUS,
} from './config/physicsConstants';

export {
  SHIELD_COST_PER_TICK,
  SHIELD_REPAIR_COST,
  SHIELD_MAX_REDUCTION,
  SHIELD_REDISTRIBUTION,
  CLEAN_PLANT_THRESHOLD,
  CLEAN_PLANT_BONUS,
};

export const SHIELD_ZONES = [
  { id: 0, label: 'Anillo superior', shortLabel: 'DET-A' },
  { id: 1, label: 'Blindaje oeste', shortLabel: 'DET-B' },
  { id: 2, label: 'Canal de vapor', shortLabel: 'DET-C' },
  { id: 3, label: 'Edificio de turbina', shortLabel: 'DET-D' },
];

export const isCleanPlant = (detectors: DetectorReading[]) =>
  detectors.every((d) => d.value < CLEAN_PLANT_THRESHOLD);

export const createInitialState = (): SimulationState => ({
  coreTemp: 300,
  coreDamage: 0,
  pressure: 15,
  controlRods: 76,
  controlRodsTarget: 76,
  coolantLevel: 100,
  primaryPumpActive: true,
  primaryPumpHealth: 100,
  primaryPumpFlow: 100,
  primaryPumpDemand: 100,
  secondaryPumpActive: true,
  secondaryPumpHealth: 100,
  secondaryPumpFlow: 100,
  fuelLevel: 100,
  containmentIntegrity: 100,
  powerOutput: 186,
  thermalPower: 560,
  decayHeat: 36,
  energyGenerated: 0,
  funds: 14000,
  gameState: 'RUNNING',
  logs: [],
  radiationLevel: 4.2,
  neutronFlux: 22,
  boronLevel: 8,
  chemistryBalance: 92,
  sprayReserve: 100,
  coolantProfile: 'balanced',
  purgeValveOpen: false,
  purgeOpenSeconds: 0,
  containmentSprayActive: false,
  sprayActiveSeconds: 0,
  turbineEfficiency: 94,
  steamVoids: 0,
  reactivity: 0.22,
  xenonPoisoning: 0,
  iodinePoison: 0,
  makeupPumpRunning: false,
  coolantLeakRate: 0,
  steamValve: 100,
  overclockTicks: 0,
  overclockCooldown: 0,
  marketDemand: 50,
  marketPrice: 60,
  upgrades: {
    fastRods: false,
    heavyPumps: false,
    betterInsulation: false,
  },
  fissionState: 'Critica estable',
  radiationShields: [false, false, false, false],
  shieldEfficiency: [100, 100, 100, 100],
  shieldActiveSeconds: [0, 0, 0, 0],
  history: {
    temp: buildSeed(300),
    pressure: buildSeed(15),
    radiation: buildSeed(4.2),
    power: buildSeed(186),
    coolant: buildSeed(100),
    reactivity: buildSeed(22),
    primaryFlow: buildSeed(100),
    secondaryFlow: buildSeed(100),
    efficiency: buildSeed(94),
    thermalPower: buildSeed(560),
  },
});

export const deriveFissionState = (state: SimulationState): FissionState => {
  if (state.gameState === 'MELTDOWN' || state.coreDamage > 96) return 'Fusion';
  if (
    state.coreDamage > 55 ||
    (state.coolantLevel < 12 && state.coreTemp > 520)
  ) {
    return 'Transitorio severo';
  }
  if (
    state.controlRods >= 99 &&
    state.neutronFlux < 18 &&
    state.coolantLevel > 20 &&
    state.coreDamage < 20
  ) {
    return 'SCRAM';
  }
  if (state.reactivity < 0.08) return 'Subcritica';
  if (state.reactivity < 0.22 && state.coreTemp < 335) return 'Critica estable';
  if (state.reactivity < 0.42 && state.coreTemp < 420) return 'Carga media';
  if (
    state.coreTemp > 760 ||
    state.pressure > 18 ||
    state.radiationLevel > 85
  ) {
    return 'Transitorio severo';
  }
  return 'Potencia alta';
};

export const buildDetectors = (sim: SimulationState): DetectorReading[] => {
  const leakage = Math.max(0, 100 - sim.containmentIntegrity) * 0.12;
  const base = sim.radiationLevel * 0.68 + sim.pressure * 0.22;

  const rawValues = [
    clamp(base * 1.06 + leakage + 0.9, 0, 240),
    clamp(base * 0.92 + leakage * 0.9 + 0.5, 0, 240),
    clamp(base * 1.18 + leakage + sim.steamVoids * 0.05, 0, 240),
    clamp(base * 0.78 + leakage * 0.7 + sim.powerOutput * 0.008, 0, 240),
  ];

  // Apply shield reduction & redistribution
  const shieldedValues = rawValues.map((raw, i) => {
    if (sim.radiationShields[i]) {
      const efficiency = (sim.shieldEfficiency[i] / 100);
      return raw * (1 - SHIELD_MAX_REDUCTION * efficiency);
    }
    return raw;
  });

  // Compute total blocked radiation and redistribute to unshielded zones
  const totalBlocked = rawValues.reduce((sum, raw, i) => {
    if (sim.radiationShields[i]) {
      const efficiency = (sim.shieldEfficiency[i] / 100);
      return sum + raw * SHIELD_MAX_REDUCTION * efficiency;
    }
    return sum;
  }, 0);

  const unshieldedCount = sim.radiationShields.filter((s) => !s).length;
  const redistributionPerZone = unshieldedCount > 0
    ? (totalBlocked * SHIELD_REDISTRIBUTION) / unshieldedCount
    : 0;

  const finalValues = shieldedValues.map((val, i) => {
    if (!sim.radiationShields[i] && unshieldedCount > 0) {
      return clamp(val + redistributionPerZone, 0, 240);
    }
    return val;
  });

  return [
    { label: 'DET-A', zone: 'Anillo superior', value: finalValues[0] },
    { label: 'DET-B', zone: 'Blindaje oeste', value: finalValues[1] },
    { label: 'DET-C', zone: 'Canal de vapor', value: finalValues[2] },
    { label: 'DET-D', zone: 'Edificio de turbina', value: finalValues[3] },
  ];
};

export const computeRiskIndex = (sim: SimulationState) => {
  if (isTerminalState(sim)) return 100;

  const temperatureRisk =
    clamp((sim.coreTemp - 300) / (MAX_TEMP - 300), 0, 1) * 26;
  const pressureRisk =
    clamp((sim.pressure - 15) / (MAX_PRESSURE - 15), 0, 1) * 18;
  const radiationRisk = clamp(sim.radiationLevel / 130, 0, 1) * 16;
  const containmentRisk =
    clamp((100 - sim.containmentIntegrity) / 100, 0, 1) * 12;
  const coolantRisk = clamp((40 - sim.coolantLevel) / 40, 0, 1) * 10;
  const coreDamageRisk = clamp(sim.coreDamage / 100, 0, 1) * 22;

  return clamp(
    temperatureRisk +
      pressureRisk +
      radiationRisk +
      containmentRisk +
      coolantRisk +
      coreDamageRisk,
    0,
    100,
  );
};

export const buildRecommendations = (sim: SimulationState) => {
  const recommendations: string[] = [];
  const thermalGap =
    sim.thermalPower > 0 ? sim.powerOutput / Math.max(sim.thermalPower, 1) : 0;
  const coolantProfile = getCoolantProfile(sim.coolantProfile);

  if (sim.coreDamage > 70) {
    recommendations.push(
      'El combustible ya acumula daño severo. SCRAM, reposición de agua y alivio de presión son prioritarios.',
    );
  }
  if (sim.coolantLevel < 12 && sim.coreDamage > 20) {
    recommendations.push(
      'Aunque la fisión caiga por pérdida de moderación, el calor residual sigue degradando el núcleo.',
    );
  }
  if (sim.pressure > 17.2) {
    recommendations.push('Abra la purga o active el spray para bajar la sobrepresión.');
  }
  if (sim.radiationLevel > 60) {
    recommendations.push(
      'Reduzca reactividad y proteja la contención con spray antes de seguir generando potencia.',
    );
  }
  if (sim.primaryPumpDemand > 100 && sim.primaryPumpHealth < 58) {
    recommendations.push(
      'El primario está en sobreimpulso con poco margen mecánico. Baja la consigna o planifica reparación antes de cavitar.',
    );
  }
  if (sim.chemistryBalance < 80) {
    recommendations.push(
      'La química automática va retrasada por la carga del circuito. Baja estrés o cambia a un refrigerante más dócil.',
    );
  }
  if (sim.purgeValveOpen && sim.purgeOpenSeconds > 18) {
    recommendations.push(
      'La purga lleva demasiado tiempo abierta; ciérrala en cuanto la presión vuelva a banda para no seguir perdiendo inventario.',
    );
  }
  if (sim.containmentSprayActive && sim.sprayActiveSeconds > 20) {
    recommendations.push(
      'El spray ya está trabajando en modo sostenido. Úsalo para recuperar margen y luego vuelve a modo conservador.',
    );
  }
  if (sim.sprayReserve < 28) {
    recommendations.push(
      'La reserva del spray de contención está baja; no la gastes en una condición que ya no lo necesita.',
    );
  }
  if (sim.primaryPumpHealth < 35 || sim.secondaryPumpHealth < 35) {
    recommendations.push(
      'Programe mantenimiento preventivo antes de exigir más a las bombas.',
    );
  }
  if (sim.turbineEfficiency < 62 || thermalGap < 0.16) {
    recommendations.push(
      'El cuello de botella ya es el tren secundario: recupere eficiencia y caudal antes de subir reactor.',
    );
  }
  if (sim.boronLevel < 4 && sim.fissionState === 'Potencia alta') {
    recommendations.push(
      'La reserva de boro es baja para un transitorio rápido; no dependa solo de las barras.',
    );
  }
  if (coolantProfile.id === 'turbosteam' && sim.pressure > 16.2) {
    recommendations.push(
      'TurboSteam te está dando más MW, pero ya castiga presión. Cambia a un blend más frío si no estás vendiendo ese pico.',
    );
  }
  if (coolantProfile.id === 'shieldx' && thermalGap < 0.18 && sim.powerOutput < 180) {
    recommendations.push(
      'Shield-X está estabilizando bien, pero te quita salida eléctrica. Si ya estás estable, vuelve a un refrigerante más rentable.',
    );
  }
  if (sim.overclockTicks > 0) {
    recommendations.push(
      'El overclock está activo: sostén P1/P2, vigila presión y sal del pulso en cuanto levantes los MW deseados.',
    );
  } else if (sim.overclockCooldown > 0 && sim.coreTemp > 340) {
    recommendations.push(
      'El núcleo sigue enfriando después del overclock. Recupera química y presión antes de intentar otro pico.',
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      'Operación nominal. Mantenga tendencia estable y reserve fondos para mantenimiento.',
    );
  }

  return recommendations.slice(0, 5);
};

const pushAlert = (
  alerts: AlertItem[],
  alert: Omit<AlertItem, 'id'>,
) => {
  alerts.push({
    ...alert,
    id: `${alert.area}-${alert.title.toLowerCase().replaceAll(' ', '-')}`,
  });
};

export const buildAlerts = (sim: SimulationState): AlertItem[] => {
  const alerts: AlertItem[] = [];
  const thermalGap =
    sim.thermalPower > 0 ? sim.powerOutput / Math.max(sim.thermalPower, 1) : 0;
  const coolantProfile = getCoolantProfile(sim.coolantProfile);

  if (sim.coreTemp > 780) {
    pushAlert(alerts, {
      area: 'reactor',
      severity: 'critical',
      title: 'Núcleo fuera de banda',
      detail: 'La temperatura del núcleo ya está en zona de daño acelerado.',
    });
  } else if (sim.coreTemp > WARNING_TEMP) {
    pushAlert(alerts, {
      area: 'reactor',
      severity: 'warning',
      title: 'Temperatura en ascenso',
      detail: 'El primario ya salió de la banda nominal y requiere margen de enfriamiento.',
    });
  }

  if (sim.primaryPumpDemand > 100) {
    pushAlert(alerts, {
      area: 'reactor',
      severity:
        sim.primaryPumpHealth < 52 || sim.coolantLevel < 52 ? 'danger' : 'warning',
      title: 'Primario en sobreimpulso',
      detail:
        'La demanda de la bomba primaria está por encima de nominal; ganas enfriamiento, pero aceleras desgaste y cavitación.',
    });
  }

  if (sim.chemistryBalance < 80) {
    pushAlert(alerts, {
      area: 'reactor',
      severity: sim.chemistryBalance < 74 ? 'danger' : 'warning',
      title: 'Química automática exigida',
      detail:
        'La estación química sigue corrigiendo el blend, pero la carga térmica está retrasando la recuperación del circuito.',
    });
  }

  if (sim.coreDamage > 70) {
    pushAlert(alerts, {
      area: 'reactor',
      severity: 'critical',
      title: 'Daño severo de combustible',
      detail: 'La degradación del núcleo ya es dominante sobre cualquier optimización de potencia.',
    });
  } else if (sim.coreDamage > 25) {
    pushAlert(alerts, {
      area: 'reactor',
      severity: 'danger',
      title: 'Daño inicial de combustible',
      detail: 'Se detecta degradación del combustible; conviene bajar potencia y recuperar agua.',
    });
  }

  if (sim.radiationLevel > 95 || sim.containmentIntegrity < 35) {
    pushAlert(alerts, {
      area: 'shared',
      severity: 'critical',
      title: 'Contención comprometida',
      detail: 'Radiación y sellado indican una liberación fuera de envolvente segura.',
    });
  } else if (sim.radiationLevel > 45 || sim.containmentIntegrity < 65) {
    pushAlert(alerts, {
      area: 'shared',
      severity: 'danger',
      title: 'Contención exigida',
      detail: 'La presión y la radiación ya están castigando los límites del edificio.',
    });
  }

  if (sim.secondaryPumpFlow < 25) {
    pushAlert(alerts, {
      area: 'turbine',
      severity: 'danger',
      title: 'Secundario sin caudal',
      detail: 'La turbina no puede aprovechar el vapor útil con este nivel de flujo.',
    });
  } else if (sim.secondaryPumpHealth < 45) {
    pushAlert(alerts, {
      area: 'turbine',
      severity: 'warning',
      title: 'Bomba secundaria fatigada',
      detail: 'El tren de generación ya depende de una bomba cercana a mantenimiento.',
    });
  }

  if (sim.turbineEfficiency < 48) {
    pushAlert(alerts, {
      area: 'turbine',
      severity: 'critical',
      title: 'Turbina muy degradada',
      detail: 'La conversión eléctrica cayó demasiado; no compense este fallo subiendo reactor.',
    });
  } else if (sim.turbineEfficiency < 68 || thermalGap < 0.14) {
    pushAlert(alerts, {
      area: 'turbine',
      severity: 'warning',
      title: 'Aprovechamiento pobre',
      detail: 'El calor útil ya no se está convirtiendo en MW eléctricos de forma eficiente.',
    });
  }

  if (sim.purgeValveOpen && sim.purgeOpenSeconds > 18) {
    pushAlert(alerts, {
      area: 'reactor',
      severity: sim.purgeOpenSeconds > 40 ? 'danger' : 'warning',
      title: 'Purga prolongada',
      detail: 'La purga ya está drenando inventario del primario más de lo recomendable.',
    });
  }

  if (sim.overclockTicks > 0) {
    pushAlert(alerts, {
      area: 'reactor',
      severity:
        sim.coreTemp > 420 || sim.pressure > 16.9 || sim.chemistryBalance < 78
          ? 'danger'
          : 'warning',
      title: 'Overclock activo',
      detail:
        'El pulso térmico del reactor está generando más MW, pero también sube calor, presión, radiación y castigo mecánico.',
    });
  }

  if (coolantProfile.id === 'turbosteam' && sim.pressure > 16.2) {
    pushAlert(alerts, {
      area: 'reactor',
      severity: 'warning',
      title: 'Coolant en modo TurboSteam',
      detail:
        'El blend actual favorece potencia y overclock, pero ya añade presión extra sobre la vasija.',
    });
  }

  if (sim.containmentSprayActive && sim.sprayReserve < 25) {
    pushAlert(alerts, {
      area: 'shared',
      severity: 'warning',
      title: 'Reserva de spray baja',
      detail: 'El spray de contención sigue activo, pero la reserva auxiliar ya se está agotando.',
    });
  }

  // Shield alerts
  const activeShields = sim.radiationShields.filter(Boolean).length;
  const avgShieldEff = activeShields > 0
    ? sim.shieldEfficiency.reduce((sum, e, i) => sim.radiationShields[i] ? sum + e : sum, 0) / activeShields
    : 0;

  if (activeShields > 0 && avgShieldEff < 40) {
    pushAlert(alerts, {
      area: 'reactor',
      severity: 'warning',
      title: 'Blindaje degradado',
      detail: 'Los escudos activos ya están por debajo del 40% de eficiencia. Repáralos o desactívalos para no seguir gastando.',
    });
  }

  if (activeShields > 0 && activeShields < 4) {
    const unshielded = 4 - activeShields;
    const detectors = buildDetectors(sim);
    const maxUnshielded = Math.max(
      ...detectors.filter((_, i) => !sim.radiationShields[i]).map((d) => d.value),
    );
    if (maxUnshielded > 25) {
      pushAlert(alerts, {
        area: 'reactor',
        severity: 'danger',
        title: 'Redistribución peligrosa',
        detail: `La radiación redistribuida ya está castigando ${unshielded} zona${unshielded > 1 ? 's' : ''} sin protección.`,
      });
    }
  }

  const detectors = buildDetectors(sim);
  if (isCleanPlant(detectors)) {
    pushAlert(alerts, {
      area: 'shared',
      severity: 'warning',
      title: 'Bonus de planta limpia activo',
      detail: `Todas las lecturas están por debajo de ${CLEAN_PLANT_THRESHOLD} mSv/h. La tarifa de exportación sube +$${CLEAN_PLANT_BONUS}/MWh.`,
    });
  }

  return alerts;
};

export const GUIDE_TOPICS: GuideTopic[] = [
  {
    id: 'fission',
    title: 'Estado de fisión',
    summary:
      'Muestra en qué régimen trabaja el núcleo y si la reacción se sostiene con margen seguro.',
    whyItMatters:
      'Es el indicador maestro del núcleo. Te dice si la reacción está controlada, si solo queda calor residual o si ya entraste en un transitorio peligroso.',
    howItWorks: [
      'Subcrítica: la reacción de cadena cae, pero el combustible sigue soltando calor residual.',
      'Crítica estable y Carga media: la reacción se sostiene y el enfriamiento acompaña.',
      'Potencia alta y Transitorio severo: el núcleo acumula calor más rápido de lo que conviene para un margen seguro.',
    ],
    whatRaisesIt: [
      'Retirar barras demasiado rápido.',
      'Quedarte sin boro o con poco veneno de xenón.',
      'Perder refrigeración y generar vacíos de vapor.',
    ],
    whatLowersIt: [
      'Insertar barras.',
      'Inyectar boro.',
      'Recuperar enfriamiento estable y bajar temperatura del primario.',
    ],
    operatorChecklist: [
      'Mira estado de fisión junto con temperatura, presión y calor residual.',
      'Si el estado sube a Potencia alta, deja de mover barras unos segundos y observa tendencia.',
      'Si entra en Transitorio severo, prioriza SCRAM o boro antes de intentar optimizar potencia.',
    ],
  },
  {
    id: 'rods',
    title: 'Barras de control',
    summary:
      'El slider mueve una consigna. La posición efectiva del mecanismo tarda en alcanzarla.',
    whyItMatters:
      'Son la forma más directa de cambiar la reactividad. Si las persigues demasiado rápido, puedes sobrecorregir.',
    howItWorks: [
      'El slider mueve una consigna; el mecanismo real baja o sube con retardo.',
      'La posición real afecta el flujo neutrónico con unos segundos de atraso.',
      'En SCRAM la consigna va al 100%, pero aun así el calor residual no desaparece de golpe.',
    ],
    whatRaisesIt: [
      'Retirar barras hacia 0%.',
      'Hacer varios cambios seguidos antes de ver respuesta.',
      'Baja reserva de boro.',
    ],
    whatLowersIt: [
      'Insertar barras.',
      'Dejar estabilizar la planta antes de volver a tocar el slider.',
      'Combinar con inyección de boro si quieres bajar reactividad sin oscilaciones.',
    ],
    operatorChecklist: [
      'Compara siempre barras objetivo contra barras reales.',
      'Haz cambios pequeños y espera a ver temperatura, presión y flujo neutrónico.',
      'Si la planta ya está nerviosa, usa boro o SCRAM antes de seguir modulando barras.',
    ],
  },
  {
    id: 'cooling',
    title: 'Bombas y refrigeración',
    summary:
      'Las bombas tienen una orden del operador y un caudal real que acelera o desacelera con retardo.',
    whyItMatters:
      'Sin caudal real suficiente, el reactor puede seguir generando calor aunque tu orden de bomba diga ON.',
    howItWorks: [
      'La primaria saca calor del núcleo y la secundaria lo lleva al tren de generación.',
      'El caudal real sube o baja gradualmente; la orden no equivale a respuesta instantánea.',
      'La consigna de P1 puede quedarse en banda nominal o entrar en sobreimpulso; más caudal ayuda, pero castiga más al equipo.',
      'Salud mecánica, química y nivel de refrigerante cambian cuánta refrigeración efectiva tienes.',
    ],
    whatRaisesIt: [
      'Bombas activas con buena salud.',
      'Subir la consigna del primario cuando necesitas sacar calor rápido.',
      'Más inventario de refrigerante.',
      'Química del primario en buen estado.',
    ],
    whatLowersIt: [
      'Desgaste de bomba.',
      'Falta de refrigerante.',
      'Química degradada o demasiado calor en el primario.',
    ],
    operatorChecklist: [
      'No leas solo ON/OFF: revisa caudal real de P1 y P2.',
      'Si la primaria cae, piensa primero en estabilidad del núcleo; si cae la secundaria, piensa en potencia y turbina.',
      'Usa el sobreimpulso del primario como maniobra breve, no como régimen permanente.',
      'Antes de levantar potencia, asegúrate de tener margen de enfriamiento real y no solo consignas altas.',
    ],
  },
  {
    id: 'overclock',
    title: 'Overclock térmico',
    summary:
      'Es un pulso breve de potencia del reactor pensado para levantar MW rápido, con un precio alto en temperatura, presión y desgaste.',
    whyItMatters:
      'Te da un pico de producción cuando la planta está sana, pero castiga química, radiación y equipo si lo usas sin margen.',
    howItWorks: [
      'Solo conviene con bombas listas, inventario alto y presión todavía en banda razonable.',
      'Durante el pulso el núcleo sube su sesgo de potencia y la extracción térmica debe acompañar.',
      'Después queda un cooldown: el reactor puede seguir vivo, pero no debes encadenar otro overclock enseguida.',
    ],
    whatRaisesIt: [
      'Primario y secundario con buen caudal.',
      'Barras menos insertadas y química sana.',
      'Temperatura y presión todavía dentro de banda.',
    ],
    whatLowersIt: [
      'SCRAM, boro o barras altas.',
      'Presión ya alta o inventario bajo.',
      'Esperar el cooldown y recuperar margen antes de repetirlo.',
    ],
    operatorChecklist: [
      'No actives overclock si ya vienes persiguiendo temperatura o presión.',
      'Sube P1 a nominal alto o sobreimpulso antes del pulso.',
      'En cuanto consigas el pico de MW, vuelve a operar en banda estable.',
    ],
  },
  {
    id: 'chemistry',
    title: 'Boro, química y purga',
    summary:
      'El boro agrega margen negativo de reactividad; la estación química ya es automática y ahora la jugada está en elegir el blend de refrigerante correcto.',
    whyItMatters:
      'Estos sistemas son el ajuste fino de la planta. Ya no microgestionas agua: decides el perfil del circuito y dejas que la química lo sostenga.',
    howItWorks: [
      'El boro baja reactividad sin necesidad de insertar mucho las barras.',
      'La purga alivia presión, pero ahora ya no te vacía un inventario imposible de recuperar.',
      'Cada blend del refrigerante cambia cuánto enfrías, cuánta radiación ves y cuánto dinero exprimes de la turbina.',
      'La química se autoajusta hacia la banda del blend activo y solo se estresa con overclock, purga o exceso de temperatura.',
    ],
    whatRaisesIt: [
      'Poca reserva de boro deja al núcleo más libre para subir.',
      'TurboSteam sube potencia, pero empuja presión.',
      'Purga abierta baja presión, pero puede castigar radiación.',
      'Química mala reduce enfriamiento y hace más difícil estabilizar aunque el sistema sea automático.',
    ],
    whatLowersIt: [
      'Inyección de boro para domar reactividad.',
      'Cambiar a un blend más estable para recuperar margen.',
      'Cerrar purga cuando ya recuperaste presión aceptable.',
    ],
    operatorChecklist: [
      'Usa boro para frenar potencia sin depender solo del slider.',
      'Usa purga solo como alivio, no como estado permanente.',
      'Si el reactor se va de presión, sal de TurboSteam antes de insistir con más MW.',
    ],
  },
  {
    id: 'radiation',
    title: 'Detectores de radiación',
    summary:
      'Los cuatro detectores leen zonas distintas y suben por potencia, vapor y fugas de contención.',
    whyItMatters:
      'Te dicen si el problema es local, de vapor, o ya generalizado en la contención.',
    howItWorks: [
      'Cada detector vigila una zona distinta y reacciona a flujo neutrónico, vapor y daño de contención.',
      'Canal de vapor alto suele aparecer con vacíos o alivio fuerte de presión.',
      'Si todos suben juntos, normalmente el problema ya es global o la contención está castigada.',
    ],
    whatRaisesIt: [
      'Más potencia y más calor en el núcleo.',
      'Purga agresiva.',
      'Peor integridad de contención o demasiado vapor en el circuito.',
    ],
    whatLowersIt: [
      'Bajar reactividad.',
      'Activar spray de contención.',
      'Recuperar presión, inventario y estabilidad del primario.',
    ],
    operatorChecklist: [
      'Mira si sube una sola zona o todas al mismo tiempo.',
      'No abras purga a ciegas si ya tienes radiación alta.',
      'Si la radiación sube junto con temperatura y presión, trata el problema del núcleo primero.',
    ],
  },
  {
    id: 'turbine',
    title: 'Turbina y generador',
    summary:
      'Convierte el calor útil del secundario en potencia eléctrica. Si cae su eficiencia, la planta produce menos aunque el reactor siga caliente.',
    whyItMatters:
      'Te permite separar un problema del reactor de uno del tren de generación. Un núcleo caliente no garantiza buena producción eléctrica.',
    howItWorks: [
      'El vapor del secundario impulsa el rotor y ese rotor arrastra al generador.',
      'Las RPM y la carga dependen del caudal secundario real, de la presión disponible y de la eficiencia mecánica.',
      'La turbina afecta la conversión eléctrica, pero no debería ser tu principal disipador del calor del reactor.',
    ],
    whatRaisesIt: [
      'Buen caudal secundario.',
      'Buena eficiencia de turbina.',
      'Presión suficiente y potencia térmica disponible.',
    ],
    whatLowersIt: [
      'Turbina desgastada.',
      'Secundario con poco caudal.',
      'Desacople entre potencia térmica y potencia eléctrica.',
    ],
    operatorChecklist: [
      'Compara MW térmicos contra MW eléctricos para ver si estás aprovechando bien el calor.',
      'Si las RPM suben pero la carga no acompaña, el problema suele ser eficiencia o acoplamiento.',
      'No subas reactor para compensar una turbina mala; primero recupera el tren de generación.',
    ],
  },
  {
    id: 'shields',
    title: 'Blindaje de radiación',
    summary:
      'Los 4 escudos de zona protegen los detectores, pero redistribuyen la radiación bloqueada a las zonas sin protección.',
    whyItMatters:
      'El blindaje convierte la radiación en un puzzle de gestión: no es solo bajar un número, es decidir qué zonas proteger y cuándo gastar en mantenerlos.',
    howItWorks: [
      'Cada escudo reduce la radiación de su zona hasta un 45%, pero la eficiencia cae con el uso.',
      'La radiación bloqueada no desaparece: un 15% se redistribuye a cada zona sin escudo.',
      'Si activas los 4, no hay redistribución, pero el costo sube a $320/segundo.',
      'Si mantienes todas las lecturas por debajo del umbral, la planta recibe un bonus de tarifa por "planta limpia".',
    ],
    whatRaisesIt: [
      'Activar pocos escudos con mucha radiación redistribuida.',
      'Escudos degradados que ya casi no absorben.',
      'Alta radiación de base por overclock, purga o daño de contención.',
    ],
    whatLowersIt: [
      'Activar escudos en las zonas que más leen.',
      'Reparar la eficiencia del blindaje periódicamente.',
      'Reducir la fuente de radiación (boro, barras, spray, blend Shield-X).',
    ],
    operatorChecklist: [
      'No actives los 4 escudos si no lo necesitas: $320/s se come rápido los fondos.',
      'Vigila la eficiencia de cada escudo; por debajo del 50% ya no justifica el costo.',
      'Combina escudos con spray y perfil Shield-X para mantener el bonus de planta limpia.',
      'Usa la reparación de blindaje antes de que los escudos caigan demasiado.',
    ],
  },
  {
    id: 'maintenance',
    title: 'Mantenimiento',
    summary:
      'El mantenimiento preventivo solo entra cuando la planta está realmente en ventana segura.',
    whyItMatters:
      'Es tu forma de recuperar margen operativo. Si nunca paras para mantener, cada acción futura cuesta más riesgo.',
    howItWorks: [
      'La ventana segura exige núcleo frío, baja presión y barras casi totalmente insertadas.',
      'El mantenimiento devuelve salud a bombas, turbina, contención y condición química.',
      'No sustituye una emergencia: sirve para prevenir que el sistema llegue al límite.',
    ],
    whatRaisesIt: [
      'Planificar paradas con tiempo.',
      'Entrar a la ventana segura antes de que el equipo esté muy degradado.',
      'Reservar fondos suficientes.',
    ],
    whatLowersIt: [
      'Operar mucho tiempo con equipos castigados.',
      'Intentar mantener con el reactor aún caliente o presurizado.',
      'Gastar todo en acciones reactivas y quedarte sin presupuesto.',
    ],
    operatorChecklist: [
      'Baja potencia con antelación y deja que el calor residual caiga.',
      'Verifica barras altas, presión baja y núcleo frío antes de pulsar mantenimiento.',
      'Hazlo antes de entrar en zona amarilla severa de bombas o turbina.',
    ],
  },
];

export const maintenanceWindowOpen = (state: SimulationState) =>
  state.coreTemp < 160 && state.pressure < 13.5 && state.controlRods > 90;

export const refuelWindowOpen = (state: SimulationState) =>
  state.coreTemp < 90 && state.pressure < 12.5 && state.controlRods > 98;

export const turbineServiceWindowOpen = (state: SimulationState) =>
  state.powerOutput < 140 && state.secondaryPumpFlow < 72 && state.pressure < 16.6;

export const getMaintenanceBlockers = (state: SimulationState) => {
  const blockers: string[] = [];

  if (state.coreTemp >= 160) blockers.push('el núcleo todavía está caliente');
  if (state.pressure >= 13.5) blockers.push('la presión sigue alta');
  if (state.controlRods <= 90) blockers.push('las barras aún no están suficientemente insertadas');

  return blockers;
};

export const getRefuelBlockers = (state: SimulationState) => {
  const blockers: string[] = [];

  if (state.coreTemp >= 90) blockers.push('el núcleo no está lo bastante frío');
  if (state.pressure >= 12.5) blockers.push('la vasija sigue presurizada');
  if (state.controlRods <= 98) blockers.push('las barras deben quedar prácticamente al 100%');

  return blockers;
};

export const getTurbineServiceBlockers = (state: SimulationState) => {
  const blockers: string[] = [];

  if (state.powerOutput >= 140) blockers.push('la carga eléctrica sigue demasiado alta');
  if (state.secondaryPumpFlow >= 72) blockers.push('el secundario todavía mueve demasiado caudal');
  if (state.pressure >= 16.6) blockers.push('la presión disponible sigue alta');

  return blockers;
};

export const getOverclockBlockers = (state: SimulationState) => {
  const blockers: string[] = [];

  if (state.gameState === 'SCRAMMED') blockers.push('el reactor está en SCRAM');
  if (state.overclockTicks > 0) blockers.push('ya hay un pulso activo');
  if (state.overclockCooldown > 0) {
    blockers.push(`faltan ${state.overclockCooldown}s de cooldown`);
  }
  if (state.controlRods > 82) blockers.push('las barras siguen demasiado insertadas');
  if (!state.primaryPumpActive || state.primaryPumpFlow < 80) {
    blockers.push('el primario no tiene caudal suficiente');
  }
  if (!state.secondaryPumpActive || state.secondaryPumpFlow < 68) {
    blockers.push('el secundario no está listo para absorber el pulso');
  }
  if (state.chemistryBalance < 84) {
    blockers.push('la química del primario está demasiado degradada');
  }
  if (state.pressure > 16.2) blockers.push('la presión ya está demasiado alta');

  return blockers;
};

export const overclockReady = (state: SimulationState) =>
  getOverclockBlockers(state).length === 0;

const buildFailureMistakes = (state: SimulationState) => {
  const mistakes: string[] = [];

  if (state.purgeOpenSeconds > 18) {
    mistakes.push('la purga quedó abierta demasiado tiempo');
  }
  if (state.chemistryBalance < 78) {
    mistakes.push('el circuito llegó químicamente fatigado al evento final');
  }
  if (state.controlRods < 90 && state.reactivity > 0.2) {
    mistakes.push('la reactividad seguía alta con las barras poco insertadas');
  }
  if (state.primaryPumpFlow < 35) {
    mistakes.push('el primario ya no estaba evacuando calor suficiente');
  }
  if (state.secondaryPumpFlow < 35) {
    mistakes.push('el secundario dejó de sacar calor útil del sistema');
  }
  if (state.containmentIntegrity < 35) {
    mistakes.push('la contención ya estaba degradada antes del evento final');
  }
  if (state.boronLevel < 8 && state.reactivity > 0.18) {
    mistakes.push('la reserva de boro ya era baja para contener el transitorio');
  }
  if (state.primaryPumpDemand > 100 && state.primaryPumpHealth < 60) {
    mistakes.push('el primario venía en sobreimpulso y ya estaba demasiado castigado');
  }
  if (state.overclockTicks > 0) {
    mistakes.push('el overclock seguía activo cuando la planta perdió margen');
  }

  return mistakes.slice(0, 4);
};

const buildFailureDiagnosticLogs = (state: SimulationState) => {
  const readings = `Diagnóstico final: T=${state.coreTemp.toFixed(1)} C, P=${state.pressure.toFixed(2)} MPa, agua=${state.coolantLevel.toFixed(1)}%, daño=${state.coreDamage.toFixed(1)}%, radiación=${formatRadiation(state.radiationLevel)}.`;
  const mistakes = buildFailureMistakes(state);
  const mistakesLine =
    mistakes.length > 0
      ? `Qué salió mal: ${mistakes.join('; ')}.`
      : 'Qué salió mal: la planta se quedó sin margen suficiente para absorber el transitorio.';

  return [readings, mistakesLine];
};

export const getReactorSteamDrive = (sim: SimulationState) =>
  clamp(sim.secondaryPumpFlow * 0.68 + Math.max(0, sim.pressure - 13.4) * 10, 0, 100);

export const getTurbineSteamDrive = (sim: SimulationState) =>
  clamp(sim.secondaryPumpFlow * 0.72 + Math.max(0, sim.pressure - 14) * 7, 0, 100);

export const getContainmentSprayIntensity = (sim: SimulationState) =>
  clamp((sim.containmentSprayActive ? 0.45 : 0) + sim.sprayReserve / 180, 0, 1);

export const getContainmentReleaseRate = (sim: SimulationState) => {
  const breachRatio = clamp((100 - sim.containmentIntegrity) / 100, 0, 1);
  const exposedCoreRatio = clamp((100 - sim.coolantLevel) / 100, 0, 1);
  return clamp(
    (sim.purgeValveOpen ? 38 : 0) +
      Math.max(0, sim.pressure - 16) * 9 +
      breachRatio * 46 +
      exposedCoreRatio * 12 +
      sim.coreDamage * 0.24,
    0,
    100
  );
};

export const getTurbineRotorRatio = (sim: SimulationState) =>
  clamp((sim.secondaryPumpFlow / 100) * (sim.turbineEfficiency / 100), 0, 1);

export const getTurbineRotorRpm = (sim: SimulationState) =>
  450 + getTurbineRotorRatio(sim) * 3150;

export const getGeneratorLoad = (sim: SimulationState) =>
  clamp((sim.powerOutput / 520) * 100, 0, 100);

export const getThermalUse = (sim: SimulationState) =>
  clamp((sim.powerOutput / Math.max(sim.thermalPower, 1)) * 100, 0, 100);

export const getTurbineSyncState = (sim: SimulationState) => {
  const rotorRpm = getTurbineRotorRpm(sim);
  return rotorRpm > 2900 && sim.turbineEfficiency > 80
    ? 'Sincronizada'
    : rotorRpm > 1600
      ? 'Acelerando'
      : 'Lenta';
};

function updateMechanics(next: SimulationState, dt: number) {
  const baseSlewRate = next.controlRodsTarget >= next.controlRods ? 9.5 : 5.5;
  const rodSlewRate = next.upgrades?.fastRods ? baseSlewRate * 2 : baseSlewRate;
  const rodDelta = next.controlRodsTarget - next.controlRods;
  next.controlRods = clamp(
    next.controlRods + clamp(rodDelta, -rodSlewRate, rodSlewRate) * dt,
    0,
    100,
  );

  const primaryFlowTarget =
    next.primaryPumpActive && next.primaryPumpHealth > 0
      ? next.primaryPumpDemand
      : 0;
  const secondaryFlowTarget =
    next.secondaryPumpActive && next.secondaryPumpHealth > 0 ? 100 : 0;

  next.primaryPumpFlow = clamp(
    next.primaryPumpFlow + (primaryFlowTarget - next.primaryPumpFlow) * (0.24 * dt),
    0,
    PRIMARY_PUMP_MAX_DEMAND,
  );
  next.secondaryPumpFlow = clamp(
    next.secondaryPumpFlow + (secondaryFlowTarget - next.secondaryPumpFlow) * (0.18 * dt),
    0,
    100,
  );

  next.purgeOpenSeconds = next.purgeValveOpen ? next.purgeOpenSeconds + dt : 0;
  next.sprayActiveSeconds = next.containmentSprayActive
    ? next.sprayActiveSeconds + dt
    : 0;
}

function calculateReactivityDynamics(next: SimulationState, dt: number) {
  const coolantProfile = getCoolantProfile(next.coolantProfile);
  const overclockActive = next.overclockTicks > 0;

  const coolantMassFactor = clamp(next.coolantLevel / 100, 0, 1);
  const voidPenalty = next.steamVoids / 240;
  const boronPenalty = next.boronLevel / 210;
  const xenonPenalty = next.xenonPoisoning / 180;
  const scramShutdownMargin = next.controlRods >= 99 ? 0.32 : 0;
  const overclockReactivityBias = overclockActive ? 0.18 : 0;
  const thermalFeedback = (315 - next.coreTemp) / 1250;
  const baseReactivity =
    ((100 - next.controlRods) / 100) * (next.fuelLevel / 100);

  next.reactivity = clamp(
    baseReactivity -
      boronPenalty -
      xenonPenalty -
      voidPenalty +
      thermalFeedback -
      scramShutdownMargin +
      overclockReactivityBias +
      coolantProfile.reactivityBias,
    0,
    1.12,
  );

  const neutronFluxTarget = clamp(
    next.reactivity * 124 + Math.max(0, next.thermalPower - 320) * 0.018,
    0,
    140,
  );
  next.neutronFlux = clamp(
    next.neutronFlux + (neutronFluxTarget - next.neutronFlux) * (0.34 * dt),
    0,
    140,
  );

  const xenonTarget = clamp(
    next.neutronFlux * 0.22 + Math.max(0, next.decayHeat - 24) * 0.08,
    0,
    40,
  );
  next.xenonPoisoning = clamp(
    next.xenonPoisoning + (xenonTarget - next.xenonPoisoning) * (0.08 * dt),
    0,
    40,
  );

  const promptPowerTarget = clamp(
    next.neutronFlux * 7.6 +
      next.reactivity * 220 +
      (overclockActive ? Math.max(340, next.thermalPower * 0.68) : 0),
    0,
    1600,
  );
  next.thermalPower = clamp(
    next.thermalPower + (promptPowerTarget - next.thermalPower) * (0.16 * dt),
    0,
    1600,
  );

  const decayHeatTarget = clamp(18 + next.thermalPower * 0.09, 18, 220);
  next.decayHeat = clamp(
    next.decayHeat + (decayHeatTarget - next.decayHeat) * (0.05 * dt),
    18,
    220,
  );
}

function updateThermalDynamics(next: SimulationState, dt: number) {
  const coolantProfile = getCoolantProfile(next.coolantProfile);
  const overclockActive = next.overclockTicks > 0;
  const primaryOverdrive = clamp(
    (next.primaryPumpDemand - 100) / (PRIMARY_PUMP_MAX_DEMAND - 100),
    0,
    1,
  );

  const coolantMassFactor = clamp(next.coolantLevel / 100, 0, 1);
  const exposureFactor = 1 - coolantMassFactor;
  const leakFactor = clamp((100 - next.containmentIntegrity) / 100, 0, 1);
  const chemistryFactor = clamp(next.chemistryBalance / 100, 0.15, 1);
  const dryCoreFactor = clamp((12 - next.coolantLevel) / 12, 0, 1);
  const sprayAvailability = clamp(next.sprayReserve / 100, 0, 1);

  const steamTransportFactor = clamp(
    coolantMassFactor * 0.82 +
      Math.max(0, next.steamVoids - 10) / 180 -
      exposureFactor * 0.32,
    0,
    1,
  );

  const primaryCooling =
    74 *
    (next.primaryPumpFlow / 100) *
    (next.primaryPumpHealth / 100) *
    Math.pow(coolantMassFactor, 1.65) *
    (0.35 + chemistryFactor * 0.75) *
    (1 - next.coreDamage / 180) *
    coolantProfile.coolingFactor;

  const secondaryCooling =
    44 *
    (next.secondaryPumpFlow / 100) *
    (next.secondaryPumpHealth / 100) *
    (next.steamValve / 100) *
    steamTransportFactor *
    (0.72 + Math.max(0, next.pressure - 12) / 16) *
    coolantProfile.coolingFactor;

  const sprayCooling =
    next.containmentSprayActive && sprayAvailability > 0
      ? 11.5 * (0.4 + sprayAvailability * 0.6)
      : 0;
  const naturalCooling =
    Math.max(0, (next.coreTemp - 35) * 0.008) *
    (0.2 + coolantMassFactor * 0.8);
  const purgePressureRelief = next.purgeValveOpen ? 1.65 : 0;

  const steamVoidsTarget = clamp(
    Math.max(0, next.coreTemp - 320) * 0.2 +
      exposureFactor * 55 +
      dryCoreFactor * 18 +
      Math.max(0, 42 - next.coolantLevel) * 1.25 -
      next.primaryPumpFlow * 0.06 -
      (next.purgeValveOpen ? 10 : 0) +
      (overclockActive ? 9 : 0),
    0,
    100,
  );
  next.steamVoids = clamp(
    next.steamVoids + (steamVoidsTarget - next.steamVoids) * (0.16 * dt),
    0,
    100,
  );

  const effectiveHeat = next.thermalPower + next.decayHeat;
  const coolingCapacity = primaryCooling + secondaryCooling + sprayCooling;
  const shutdownCoolingBias =
    clamp((120 - effectiveHeat) / 120, 0, 1) *
    (1 - clamp(next.reactivity / 0.08, 0, 1));
  const equilibriumTempFloor = 285 - shutdownCoolingBias * 205;
  const leakLoss = leakFactor * 48 * (next.upgrades.betterInsulation ? 0.5 : 1);
  const tempTarget =
    equilibriumTempFloor +
    effectiveHeat * 0.29 -
    coolingCapacity * 1.72 +
    next.steamVoids * 1.22 +
    Math.max(0, 35 - next.coolantLevel) * 3.2 +
    exposureFactor * 420 +
    dryCoreFactor * 220 +
    leakLoss +
    next.coreDamage * 1.8 +
    primaryOverdrive * 6 +
    (overclockActive ? 34 * coolantProfile.overclockFactor : 0) +
    (next.purgeValveOpen ? 5.5 : 0) -
    (next.containmentSprayActive ? 4.5 * sprayAvailability : 0);
  next.coreTemp = clamp(
    next.coreTemp + (tempTarget - next.coreTemp) * (0.14 * dt) - naturalCooling * (0.04 * dt),
    30,
    1500,
  );

  const pressureTarget =
    15 +
    (next.coreTemp - 300) * 0.014 * coolantProfile.pressureFactor +
    next.steamVoids * 0.04 +
    Math.max(0, 45 - next.coolantLevel) * 0.055 +
    exposureFactor * 2.8 -
    dryCoreFactor * 0.85 +
    next.coreDamage * 0.018 -
    primaryOverdrive * 0.08 +
    (overclockActive ? 0.48 * coolantProfile.pressureFactor : 0) -
    purgePressureRelief -
    leakFactor * 1.7 -
    (next.containmentSprayActive ? 0.9 * (0.35 + sprayAvailability * 0.65) : 0);
  next.pressure = clamp(
    next.pressure + (pressureTarget - next.pressure) * (0.24 * dt),
    4,
    24,
  );
}

function updateDamageAndRadiation(next: SimulationState, dt: number) {
  const coolantProfile = getCoolantProfile(next.coolantProfile);
  const overclockActive = next.overclockTicks > 0;
  const coolantMassFactor = clamp(next.coolantLevel / 100, 0, 1);
  const exposureFactor = 1 - coolantMassFactor;
  const leakFactor = clamp((100 - next.containmentIntegrity) / 100, 0, 1);
  const dryCoreFactor = clamp((12 - next.coolantLevel) / 12, 0, 1);
  const sprayAvailability = clamp(next.sprayReserve / 100, 0, 1);

  const fuelDamageTarget = clamp(
    Math.max(0, next.coreTemp - 620) * 0.09 +
      Math.max(0, 22 - next.coolantLevel) * 2.6 +
      exposureFactor * 36 +
      dryCoreFactor * 18 +
      Math.max(0, next.pressure - 17.2) * 10 +
      leakFactor * 16 +
      Math.max(0, next.decayHeat - 45) * 0.22,
    0,
    100,
  );
  const damageResponse =
    fuelDamageTarget > next.coreDamage
      ? 0.12 + exposureFactor * 0.14 + dryCoreFactor * 0.08 + leakFactor * 0.04
      : 0.015;
  next.coreDamage = clamp(
    next.coreDamage + (fuelDamageTarget - next.coreDamage) * (damageResponse * dt),
    0,
    100,
  );

  const radiationTarget =
    next.neutronFlux * 0.22 +
    Math.max(0, next.coreTemp - 320) * 0.03 +
    next.steamVoids * 0.11 +
    leakFactor * 85 +
    exposureFactor * 22 +
    next.coreDamage * 0.72 +
    dryCoreFactor * 18 +
    (overclockActive ? 5.2 : 0) +
    (next.purgeValveOpen ? 7 : 0) -
    (1 - coolantProfile.radiationFactor) * 26 -
    (next.containmentSprayActive ? 2.1 * (0.35 + sprayAvailability * 0.65) : 0);
  next.radiationLevel = clamp(
    next.radiationLevel + (radiationTarget - next.radiationLevel) * (0.24 * dt),
    0,
    260,
  );
}

function calculateElectricalOutput(next: SimulationState, dt: number) {
  const coolantProfile = getCoolantProfile(next.coolantProfile);
  const overclockActive = next.overclockTicks > 0;
  const coolantMassFactor = clamp(next.coolantLevel / 100, 0, 1);
  const exposureFactor = 1 - coolantMassFactor;
  const steamTransportFactor = clamp(
    coolantMassFactor * 0.82 +
      Math.max(0, next.steamVoids - 10) / 180 -
      exposureFactor * 0.32,
    0,
    1,
  );

  const electricalEfficiency =
    (next.turbineEfficiency / 100) *
    (next.chemistryBalance / 100) *
    (next.secondaryPumpFlow / 100) *
    (0.25 + steamTransportFactor * 0.75) *
    0.46 *
    coolantProfile.powerFactor;
  const powerTarget =
    steamTransportFactor > 0.08 &&
    next.secondaryPumpFlow > 18 &&
    next.primaryPumpFlow > 18 &&
    next.coreTemp > 190
      ? Math.max(
          0,
          next.thermalPower *
            electricalEfficiency *
            (overclockActive ? 1.34 * coolantProfile.overclockFactor : 1),
        )
      : 0;
  next.powerOutput = clamp(
    next.powerOutput + (powerTarget - next.powerOutput) * (0.25 * dt),
    0,
    520,
  );

  const energyThisTick = (next.powerOutput / 3600) * dt;
  next.energyGenerated += energyThisTick;
  next.funds += energyThisTick * computeExportPrice(next) - (coolantProfile.upkeepPerTick * dt);
}

function updateChemistryAndMaintenance(next: SimulationState, dt: number) {
  const coolantProfile = getCoolantProfile(next.coolantProfile);
  const overclockActive = next.overclockTicks > 0;
  const primaryOverdrive = clamp(
    (next.primaryPumpDemand - 100) / (PRIMARY_PUMP_MAX_DEMAND - 100),
    0,
    1,
  );
  const coolantMassFactor = clamp(next.coolantLevel / 100, 0, 1);
  const exposureFactor = 1 - coolantMassFactor;
  const leakFactor = clamp((100 - next.containmentIntegrity) / 100, 0, 1);

  next.fuelLevel = clamp(next.fuelLevel - next.reactivity * (0.018 * dt), 0, 100);
  next.boronLevel = clamp(next.boronLevel - next.reactivity * (0.01 * dt), 0, 100);
  if (next.primaryPumpFlow > 4) {
    const heavyPumpsMultiplier = next.upgrades?.heavyPumps ? 0.5 : 1.0;
    next.primaryPumpHealth = clamp(
      next.primaryPumpHealth -
        (0.02 +
          (next.primaryPumpFlow / 100) * 0.03 +
          next.reactivity * 0.022 +
          Math.max(0, next.coreTemp - 340) * 0.0018 +
          primaryOverdrive * 0.65 +
          (overclockActive ? 0.03 : 0) +
          (next.purgeValveOpen ? 0.012 : 0)) * dt * heavyPumpsMultiplier,
      0,
      100,
    );
  }

  if (next.secondaryPumpFlow > 4) {
    next.secondaryPumpHealth = clamp(
      next.secondaryPumpHealth -
        (0.018 +
          (next.secondaryPumpFlow / 100) * 0.024 +
          next.powerOutput * 0.00005 +
          leakFactor * 0.015 +
          Math.max(0, next.pressure - 16.5) * 0.02) * dt,
      0,
      100,
    );
  }

  next.turbineEfficiency = clamp(
    next.turbineEfficiency -
      (0.014 +
        Math.max(0, next.pressure - 16.5) * 0.035 +
        (next.secondaryPumpFlow > 8 ? 0.004 : 0)) * dt,
    0,
    100,
  );

  const chemistryStress =
    0.012 +
    Math.max(0, next.coreTemp - 360) * 0.0008 +
    primaryOverdrive * (0.002 + Math.max(0, next.coreTemp - 320) * 0.00008) +
    (overclockActive ? 0.03 : 0) +
    (next.purgeValveOpen ? 0.05 : 0) +
    (next.containmentSprayActive ? 0.01 : 0);
  const chemistryTarget =
    coolantProfile.chemistryTarget -
    (overclockActive ? 6 : 0) -
    (next.purgeValveOpen ? 4 : 0);
  next.chemistryBalance = clamp(
    next.chemistryBalance +
      (chemistryTarget - next.chemistryBalance) * (0.16 * dt) -
      (chemistryStress * dt),
    70,
    100,
  );

  if (next.coolantLeakRate > 0) {
    next.coolantLevel -= next.coolantLeakRate * dt;
  }
  if (next.makeupPumpRunning) {
    next.coolantLevel += 8.0 * dt;
  }
  next.coolantLevel = clamp(next.coolantLevel, 0, 100);

  if (next.overclockTicks > 0) {
    next.overclockTicks -= dt;
  }
  if (next.overclockCooldown > 0) {
    next.overclockCooldown -= dt;
  }

  next.sprayReserve = clamp(
    next.sprayReserve - (next.containmentSprayActive ? (0.16 * dt) : -(0.02 * dt)),
    0,
    100,
  );

  let shieldCostThisTick = 0;
  for (let i = 0; i < 4; i++) {
    if (next.radiationShields[i]) {
      next.shieldActiveSeconds[i] += dt;
      const radStress = clamp(next.radiationLevel / 120, 0, 1) * 0.35;
      next.shieldEfficiency[i] = clamp(
        next.shieldEfficiency[i] - (0.28 + radStress) * dt,
        25,
        100,
      );
      shieldCostThisTick += SHIELD_COST_PER_TICK * dt;
    } else {
      next.shieldActiveSeconds[i] = 0;
      next.shieldEfficiency[i] = clamp(
        next.shieldEfficiency[i] + (0.06 * dt),
        0,
        100,
      );
    }
  }
  next.funds -= shieldCostThisTick;

  if (
    next.coreTemp > 720 ||
    next.pressure > 17.5 ||
    next.radiationLevel > 70 ||
    next.coolantLevel < 18
  ) {
    const containmentLoss =
      Math.max(0, next.radiationLevel - 35) * 0.03 +
      Math.max(0, next.pressure - 17) * 1.05 +
      Math.max(0, next.coreTemp - 720) * 0.02 +
      exposureFactor * 0.8 +
      next.coreDamage * 0.08;
    next.containmentIntegrity = clamp(
      next.containmentIntegrity - (containmentLoss * dt),
      0,
      100,
    );
  }
}

function evaluateEvents(
  prev: SimulationState,
  next: SimulationState,
  { pushLog, pushNotice }: StepContext
) {
  if (next.primaryPumpHealth === 0 && prev.primaryPumpHealth > 0) {
    pushLog('CRITICAL', 'Fallo mecánico en la bomba primaria.');
    pushNotice({
      tone: 'danger',
      title: 'Bomba primaria fuera de servicio',
      detail: 'La extracción de calor del núcleo se degradó bruscamente.',
    });
  }

  if (next.secondaryPumpHealth === 0 && prev.secondaryPumpHealth > 0) {
    pushLog('CRITICAL', 'Fallo mecánico en la bomba secundaria.');
    pushNotice({
      tone: 'danger',
      title: 'Bomba secundaria fuera de servicio',
      detail: 'La turbina ya no tiene un caudal útil estable.',
    });
  }

  if (next.coolantLevel < 30 && prev.coolantLevel >= 30) {
    pushLog('DANGER', 'Reserva de refrigerante por debajo del 30%.');
    pushNotice({
      tone: 'warning',
      title: 'Reserva de agua baja',
      detail: 'El inventario del primario cayó por debajo del 30%.',
    });
  }

  if (next.overclockTicks <= 0 && prev.overclockTicks > 0) {
    pushLog(
      'WARN',
      'Pulso de overclock finalizado. La planta entra a recuperación térmica.',
    );
    pushNotice({
      tone: 'warning',
      title: 'Overclock finalizado',
      detail:
        'El pico de MW terminó; ahora recupera química, presión y margen del primario.',
    });
  }

  if (next.overclockCooldown <= 0 && prev.overclockCooldown > 0) {
    pushLog('INFO', 'Cooldown de overclock completado. El reactor puede volver a intentarlo.');
    pushNotice({
      tone: 'info',
      title: 'Overclock disponible',
      detail: 'El reactor volvió a quedar listo para otro pulso si la planta sigue sana.',
    });
  }

  if (next.radiationLevel > 45 && prev.radiationLevel <= 45) {
    pushLog(
      'WARN',
      'Los detectores reportan radiación creciente en la contención.',
    );
  }

  if (next.radiationLevel > 95 && prev.radiationLevel <= 95) {
    pushLog(
      'CRITICAL',
      'Radiación fuera de envolvente segura. Priorice mitigación.',
    );
    pushNotice({
      tone: 'danger',
      title: 'Radiación crítica',
      detail: 'La contención ya está fuera de su banda segura.',
    });
  }

  if (next.chemistryBalance < 80 && prev.chemistryBalance >= 80) {
    pushLog(
      'WARN',
      'La química automática del primario salió de banda. El blend ya no está dando su mejor rendimiento.',
    );
  }

  if (next.purgeOpenSeconds >= 20 && prev.purgeOpenSeconds < 20) {
    pushLog(
      'WARN',
      'La purga lleva demasiado tiempo abierta. Ya está drenando inventario del primario.',
    );
    pushNotice({
      tone: 'warning',
      title: 'Purga prolongada',
      detail: 'La presión bajó, pero la purga ya empezó a costar inventario del primario.',
    });
  }

  if (next.sprayActiveSeconds >= 25 && prev.sprayActiveSeconds < 25) {
    pushLog(
      'WARN',
      'El spray de contención sigue activo de forma sostenida. Vigile la reserva auxiliar.',
    );
  }

  if (next.sprayReserve < 30 && prev.sprayReserve >= 30) {
    pushLog(
      'WARN',
      'La reserva auxiliar del spray cae por debajo del 30%.',
    );
  }

  if (next.containmentIntegrity < 65 && prev.containmentIntegrity >= 65) {
    pushLog(
      'DANGER',
      'Integridad de contención comprometida. Revise purga y spray.',
    );
  }

  if (next.containmentIntegrity < 5 && prev.containmentIntegrity >= 5) {
    pushLog(
      'CRITICAL',
      'Fallo severo de contención. Se detecta fuga masiva y liberación al edificio.',
    );
    pushNotice({
      tone: 'danger',
      title: 'Pérdida severa de contención',
      detail: 'La planta ya libera material al edificio de forma masiva.',
    });
  }

  if (next.coolantLevel < 8 && prev.coolantLevel >= 8) {
    pushLog(
      'CRITICAL',
      'LOCA severo: el núcleo se está quedando prácticamente sin refrigerante.',
    );
  }

  if (next.coolantLevel < 12 && prev.coolantLevel >= 12) {
    pushLog(
      'DANGER',
      'La moderación cae por falta de agua, pero el calor residual sigue amenazando el combustible.',
    );
  }

  if (next.coreDamage > 25 && prev.coreDamage <= 25) {
    pushLog(
      'DANGER',
      'Se detecta daño inicial de combustible. La envolvente del núcleo ya no está sana.',
    );
  }

  if (next.coreDamage > 70 && prev.coreDamage <= 70) {
    pushLog(
      'CRITICAL',
      'Daño severo de combustible. Riesgo de fusión inminente.',
    );
    pushNotice({
      tone: 'danger',
      title: 'Daño severo de combustible',
      detail: 'El margen de recuperación ya se está cerrando rápidamente.',
    });
  }

  if (
    next.turbineEfficiency < 60 &&
    prev.turbineEfficiency >= 60
  ) {
    pushLog(
      'WARN',
      'La eficiencia de turbina cayó a zona degradada. El problema ya es del tren secundario.',
    );
  }

  const thermalGap = next.powerOutput / Math.max(next.thermalPower, 1);
  const prevThermalGap = prev.powerOutput / Math.max(prev.thermalPower, 1);
  if (thermalGap < 0.14 && prevThermalGap >= 0.14 && next.thermalPower > 300) {
    pushLog(
      'WARN',
      'La conversión a potencia eléctrica cayó. El rotor ya no está aprovechando el calor disponible.',
    );
  }

  if (
    next.fissionState === 'Transitorio severo' &&
    prev.fissionState !== 'Transitorio severo'
  ) {
    pushLog(
      'DANGER',
      'Estado de fisión inestable. El núcleo entró en transitorio severo.',
    );
  }

  if (
    prev.fissionState === 'Transitorio severo' &&
    (next.fissionState === 'Carga media' ||
      next.fissionState === 'Critica estable' ||
      next.fissionState === 'SCRAM')
  ) {
    pushLog('INFO', 'La respuesta del núcleo vuelve a zona controlada.');
  }

  if (next.gameState === 'MELTDOWN' && prev.gameState !== 'MELTDOWN') {
    pushLog('CRITICAL', 'Fusión del núcleo. Se perdió la planta.');
    buildFailureDiagnosticLogs(next).forEach((message) =>
      pushLog('CRITICAL', message),
    );
    pushNotice({
      tone: 'danger',
      title: 'Fusión del núcleo',
      detail: 'La envolvente segura se perdió. Reinicia la simulación para volver a operar.',
    });
  } else if (next.gameState === 'EXPLOSION' && prev.gameState !== 'EXPLOSION') {
    pushLog('CRITICAL', 'Explosión por sobrepresión. Vasija destruida.');
    buildFailureDiagnosticLogs(next).forEach((message) =>
      pushLog('CRITICAL', message),
    );
    pushNotice({
      tone: 'danger',
      title: 'Explosión por sobrepresión',
      detail: 'La vasija excedió su límite mecánico.',
    });
  }
}

function updateEconomy(next: SimulationState, dt: number) {
  const basePrice = 145;
  const cyclePhase = (next.energyGenerated * 0.05) % (Math.PI * 2);
  const sineFluctuation = Math.sin(cyclePhase) * 40; // +- 40 fluctuation
  const noise = (Math.random() - 0.5) * 5; // small noise
  
  next.marketPrice = clamp(basePrice + sineFluctuation + noise, 30, 300);
  
  const baseDemand = 50;
  const demandSine = Math.cos(cyclePhase * 0.8) * 30; // slightly different phase
  next.marketDemand = clamp(baseDemand + demandSine + noise, 0, 100);
}

export const advanceSimulation = (
  prev: SimulationState,
  { pushLog, pushNotice }: StepContext,
) => {
  if (isTerminalState(prev)) return prev;

  const next = cloneState(prev);
  const SUBTICKS = 10;
  const dt = 1.0 / SUBTICKS;

  for (let i = 0; i < SUBTICKS; i++) {
    if (isTerminalState(next)) break;

    updateMechanics(next, dt);
    calculateReactivityDynamics(next, dt);
    updateThermalDynamics(next, dt);
    updateDamageAndRadiation(next, dt);
    calculateElectricalOutput(next, dt);
    updateChemistryAndMaintenance(next, dt);
    updateEconomy(next, dt);

    const dryCoreMeltdown = next.coolantLevel < 6 && next.coreDamage > 78;
    const uncontainedCoreDamage =
      next.containmentIntegrity < 3 &&
      next.radiationLevel > 180 &&
      next.coreDamage > 72;

    if (
      next.coreTemp > MAX_TEMP ||
      next.coreDamage > 96 ||
      dryCoreMeltdown ||
      uncontainedCoreDamage
    ) {
      next.gameState = 'MELTDOWN';
      next.containmentIntegrity = 0;
      next.fissionState = 'Fusion';
      break;
    } else if (next.pressure > MAX_PRESSURE) {
      next.gameState = 'EXPLOSION';
      next.containmentIntegrity = 0;
      break;
    }
  }

  next.fissionState = deriveFissionState(next);
  next.history.temp = pushHistory(next.history.temp, next.coreTemp);
  next.history.pressure = pushHistory(next.history.pressure, next.pressure);
  next.history.radiation = pushHistory(next.history.radiation, next.radiationLevel);
  next.history.power = pushHistory(next.history.power, next.powerOutput);
  next.history.coolant = pushHistory(next.history.coolant, next.coolantLevel);
  next.history.reactivity = pushHistory(next.history.reactivity, next.reactivity * 100);
  next.history.primaryFlow = pushHistory(next.history.primaryFlow, next.primaryPumpFlow);
  next.history.secondaryFlow = pushHistory(next.history.secondaryFlow, next.secondaryPumpFlow);
  next.history.efficiency = pushHistory(next.history.efficiency, next.turbineEfficiency);
  next.history.thermalPower = pushHistory(next.history.thermalPower, next.thermalPower);

  evaluateEvents(prev, next, { pushLog, pushNotice });

  return next;
};
