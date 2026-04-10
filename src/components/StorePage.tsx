import { ShoppingCart } from 'lucide-react';
import type { SimulationState } from '../sim';

interface StorePageProps {
  sim: SimulationState;
  onBuyUpgrade: (upgradeId: keyof SimulationState['upgrades']) => void;
}

const UPGRADES: {
  id: keyof SimulationState['upgrades'];
  title: string;
  description: string;
  baseCost: number;
}[] = [
  { id: 'rods', title: 'Mecanismos Rápidos', description: 'Los motores de las barras de control se mueven hasta 2.25x más rápido.', baseCost: 8000 },
  { id: 'pumps', title: 'Bombas Reforzadas', description: 'Las bombas primarias y secundarias sufren hasta 75% menos desgaste mecánico.', baseCost: 12000 },
  { id: 'insulation', title: 'Aislamiento Térmico', description: 'Reduce hasta un 60% las pérdidas térmicas en caso de fuga.', baseCost: 10000 },
  { id: 'radiation', title: 'Contención de Radiación', description: 'Reduce hasta un 50% la radiación emitida al edificio.', baseCost: 15000 },
  { id: 'security', title: 'Seguridad de Vasija', description: 'Reduce hasta un 75% la degradación de contención por eventos extremos.', baseCost: 14000 },
  { id: 'maxTemp', title: 'Aleaciones Térmicas', description: 'Aumenta la temperatura máxima antes de fusión hasta en 400°C.', baseCost: 20000 },
  { id: 'maxPressure', title: 'Refuerzo de Presión', description: 'Aumenta la presión máxima soportada por la vasija hasta en 10 MPa.', baseCost: 18000 },
  { id: 'energyGeneration', title: 'Generación Avanzada', description: 'Extrae hasta un 50% más MW eléctricos de la misma potencia térmica.', baseCost: 25000 },
  { id: 'turbines', title: 'Turbinas de Titanio', description: 'La eficiencia de las turbinas cae hasta un 75% más despacio.', baseCost: 12000 },
  { id: 'generator', title: 'Superconductores', description: 'Mejora la conversión eléctrica bruta del generador hasta un 25%.', baseCost: 16000 },
];

export function StorePage({ sim, onBuyUpgrade }: StorePageProps) {
  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="panel-glass mb-6 rounded-[32px] border border-slate-800/80 p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-[0.1em] text-slate-100">
                  Tienda de Mejoras
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Adquiere mejoras permanentes para la planta. Máximo nivel 5 por categoría.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {UPGRADES.map((upgrade) => {
            const level = sim.upgrades[upgrade.id] || 0;
            const isMax = level >= 5;
            const cost = upgrade.baseCost * Math.pow(1.5, level);

            return (
              <div
                key={upgrade.id}
                className={`flex flex-col justify-between rounded-2xl border p-5 transition-all duration-300 ${
                  level > 0
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-slate-800/70 bg-slate-950/70'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-200">{upgrade.title}</h3>
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 w-4 rounded-full ${
                            i < level ? 'bg-emerald-400' : 'bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-slate-400">
                    {upgrade.description}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                    Nivel {level} / 5
                  </div>
                  <button
                    onClick={() => onBuyUpgrade(upgrade.id)}
                    disabled={isMax || sim.funds < cost}
                    className={`rounded-xl px-4 py-2 text-xs font-medium transition ${
                      isMax
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 cursor-default'
                        : sim.funds >= cost
                        ? 'bg-slate-900 border border-slate-700 text-emerald-300 hover:bg-slate-800 hover:border-emerald-500/50'
                        : 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    {isMax ? 'MÁXIMO' : `$${cost.toLocaleString('es-MX')}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
