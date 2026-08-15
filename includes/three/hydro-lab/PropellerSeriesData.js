// Extracted from local marin-Hydro Øving13 free-running propeller table.
// Used as a small offline open-water curve before falling back to heuristics.

export const LOCAL_OVING13_OPEN_WATER = [
  { J: 0.000000, KT: 0.688998, KQ: 0.072493, eta0: 0.000000 },
  { J: 0.100169, KT: 0.630000, KQ: 0.070403, eta0: 0.142659 },
  { J: 0.199906, KT: 0.568000, KQ: 0.068701, eta0: 0.263046 },
  { J: 0.300074, KT: 0.507999, KQ: 0.066688, eta0: 0.363799 },
  { J: 0.399811, KT: 0.447999, KQ: 0.063902, eta0: 0.446104 },
  { J: 0.499980, KT: 0.389998, KQ: 0.060187, eta0: 0.515621 },
  { J: 0.600149, KT: 0.331000, KQ: 0.055595, eta0: 0.568683 },
  { J: 0.699885, KT: 0.269000, KQ: 0.049894, eta0: 0.600555 },
  { J: 0.800054, KT: 0.202002, KQ: 0.043289, eta0: 0.594172 },
  { J: 0.899791, KT: 0.126001, KQ: 0.035602, eta0: 0.506835 },
  { J: 0.999960, KT: 0.040000, KQ: 0.026701, eta0: 0.238416 },
].map((point) => ({
  ...point,
  ktOverJ2: point.J > 0 ? point.KT / (point.J * point.J) : Infinity,
}));

export const LOCAL_OVING13_FULL_SCALE_TRIAL = [
  { Vs: 2.061046, wake: 0.216668, thrustDeduction: 0.109873, etaR: 0.896633, etaH: 1.136334, ktOverJ2: 0.392889, Jstar: 0.759740, KQstar: 0.048584, rpm: 63.751541, deliveredPowerKw: 13.395306, twoPropellersPowerKw: 26.790613 },
  { Vs: 3.091569, wake: 0.228612, thrustDeduction: 0.187538, etaR: 0.921007, etaH: 1.053246, ktOverJ2: 0.417980, Jstar: 0.748675, KQstar: 0.046472, rpm: 95.560948, deliveredPowerKw: 42.011450, twoPropellersPowerKw: 84.022900 },
  { Vs: 4.119198, wake: 0.247977, thrustDeduction: 0.209982, etaR: 0.935409, etaH: 1.050524, ktOverJ2: 0.463782, Jstar: 0.729950, KQstar: 0.045508, rpm: 127.312822, deliveredPowerKw: 95.785507, twoPropellersPowerKw: 191.571015 },
  { Vs: 5.149721, wake: 0.254584, thrustDeduction: 0.248651, etaR: 0.946622, etaH: 1.007960, ktOverJ2: 0.530320, Jstar: 0.705725, KQstar: 0.046092, rpm: 163.180450, deliveredPowerKw: 201.861587, twoPropellersPowerKw: 403.723173 },
  { Vs: 6.180566, wake: 0.269901, thrustDeduction: 0.266923, etaR: 0.960763, etaH: 1.004079, ktOverJ2: 0.710826, Jstar: 0.652539, KQstar: 0.050377, rpm: 207.455726, deliveredPowerKw: 446.670898, twoPropellersPowerKw: 893.341797 },
  { Vs: 6.695827, wake: 0.272575, thrustDeduction: 0.252823, etaR: 0.966666, etaH: 1.027153, ktOverJ2: 0.838498, Jstar: 0.620065, KQstar: 0.054753, rpm: 235.655061, deliveredPowerKw: 707.234691, twoPropellersPowerKw: 1414.469381 },
];

export const LOCAL_PROPULSION_DATASET = {
  id: 'local-oving13',
  label: 'Lokal marin-Hydro Oving13 friprove/propulsjonsprove',
  openWater: LOCAL_OVING13_OPEN_WATER,
  fullScaleTrial: LOCAL_OVING13_FULL_SCALE_TRIAL,
};
