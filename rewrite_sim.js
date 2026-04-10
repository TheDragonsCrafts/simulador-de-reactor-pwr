const fs = require('fs');

const content = fs.readFileSync('src/sim.ts', 'utf8');
const targetIndex = content.indexOf('export const advanceSimulation = (');

if (targetIndex === -1) {
  console.error("Not found");
  process.exit(1);
}

const prefix = content.slice(0, targetIndex);

const newSimSuffix = `export const getReactorSteamDrive = (sim: SimulationState) =>
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
  const rodSlewRate = next.controlRodsTarget >= next.controlRods ? 9.5 : 5.5;
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
  const xenonPenalty = next.xenonPoison / 180;
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
  next.xenonPoison = clamp(
    next.xenonPoison + (xenonTarget - next.xenonPoison) * (0.08 * dt),
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
  const tempTarget =
    equilibriumTempFloor +
    effectiveHeat * 0.29 -
    coolingCapacity * 1.72 +
    next.steamVoids * 1.22 +
    Math.max(0, 35 - next.coolantLevel) * 3.2 +
    exposureFactor * 420 +
    dryCoreFactor * 220 +
    leakFactor * 48 +
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
    next.primaryPumpHealth = clamp(
      next.primaryPumpHealth -
        (0.02 +
          (next.primaryPumpFlow / 100) * 0.03 +
          next.reactivity * 0.022 +
          Math.max(0, next.coreTemp - 340) * 0.0018 +
          exposureFactor * 0.08 +
          primaryOverdrive * 0.05 +
          (overclockActive ? 0.03 : 0) +
          (next.purgeValveOpen ? 0.012 : 0)) * dt,
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

  next.coolantLevel = 100;

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
`;

fs.writeFileSync('src/sim.ts', prefix + newSimSuffix);
console.log('sim.ts rewritten successfully.');
