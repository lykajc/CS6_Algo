// Standard Bacterial Foraging Optimization (BFO) — baseline algorithm.
// Implements the four key operators described in Khayyat (2023):
//   chemotaxis, swarming (via Jcc fitness), reproduction, and elimination-dispersal.
// Used for feature selection in the IBFO-ODLAD pipeline.

class BFO {
  // config fields (all optional; paper defaults applied):
  //   M   — population size (number of bacteria)
  //   Nc  — maximum chemotaxis steps per reproduction cycle
  //   Nre — number of reproduction cycles per elimination-dispersal event
  //   Ned — number of elimination-dispersal events
  //   Ns  — maximum swim length per tumble
  //   Ped — elimination-dispersal probability (migration probability)
  //   C   — step size for bacterium movement
  //   dim — feature space dimensionality
  //   fitness — fitness function reference (from fitness.js)
  constructor(config) {
    this.M = config.M || 20;
    this.Nc = config.Nc || 40;
    this.Nre = config.Nre || 4;
    this.Ned = config.Ned || 2;
    this.Ns = config.Ns || 4;
    this.Ped = config.Ped || 0.25;
    this.C = config.C || 0.1;
    this.dim = config.dim || 20;
    this.fitness = config.fitness;

    // State
    this.bacteria = this._init();
    this.bestFitness = Infinity;
    this.bestPos = null;
    this.history = []; // best fitness recorded after each chemotaxis step
    this.timeMs = 0;
  }

  // Initialise bacteria positions uniformly in [0, 1]^dim (Khayyat, 2023, Eq. 2).
  _init() {
    return Array.from({ length: this.M }, () =>
      Array.from({ length: this.dim }, () => Math.random()),
    );
  }

  // Tumble: generate a random unit-vector direction Δ(i) for movement.
  _tumble() {
    const d = Array.from({ length: this.dim }, () => Math.random() * 2 - 1);
    const norm = Math.sqrt(d.reduce((s, v) => s + v * v, 0)) || 1;
    return d.map((v) => v / norm);
  }

  // Move bacterium one step of length C along direction dir; clamp to [0, 1].
  // Implements Khayyat (2023), Eq. (3): θ(j+1, k, l) = θ(j, k, l) + C · Δ(i).
  _move(pos, dir) {
    return pos.map((x, i) => Math.max(0, Math.min(1, x + this.C * dir[i])));
  }

  // Full BFO optimization loop.
  run() {
    const t0 = performance.now();

    for (let l = 0; l < this.Ned; l++) {
      // elimination-dispersal loop
      for (let k = 0; k < this.Nre; k++) {
        // reproduction loop
        const health = new Array(this.M).fill(0);

        for (let j = 0; j < this.Nc; j++) {
          // chemotaxis loop
          for (let i = 0; i < this.M; i++) {
            let fitOld = this.fitness(this.bacteria[i]);
            health[i] += fitOld;

            const dir = this._tumble();
            let newPos = this._move(this.bacteria[i], dir);
            let fitNew = this.fitness(newPos);

            // Greedy acceptance (BFO limitation): swim only when fitness improves.
            // This exploitation-heavy strategy makes BFO prone to local optima.
            let m = 0;
            while (fitNew < fitOld && m < this.Ns) {
              this.bacteria[i] = newPos;
              fitOld = fitNew;
              health[i] += fitOld;
              newPos = this._move(this.bacteria[i], dir);
              fitNew = this.fitness(newPos);
              m++;
            }

            // Track global best.
            if (fitOld < this.bestFitness) {
              this.bestFitness = fitOld;
              this.bestPos = [...this.bacteria[i]];
            }
          }

          this.history.push(this.bestFitness);
        }

        // Reproduction: rank by accumulated health (lower = healthier);
        // discard the worst half and clone the surviving half.
        const ranked = health
          .map((h, i) => ({ h, i }))
          .sort((a, b) => a.h - b.h);
        const keepers = ranked
          .slice(0, this.M / 2)
          .map((o) => this.bacteria[o.i]);
        this.bacteria = [
          ...keepers.map((b) => [...b]),
          ...keepers.map((b) => [...b]),
        ];
      }

      // Elimination-dispersal: randomly reinitialise each bacterium with probability Ped.
      for (let i = 0; i < this.M; i++) {
        if (Math.random() < this.Ped) {
          this.bacteria[i] = Array.from({ length: this.dim }, () =>
            Math.random(),
          );
        }
      }
    }

    this.timeMs = performance.now() - t0;
    return this._result();
  }

  // Compile and return the final result metrics.
  _result() {
    const selected = this.bestPos
      ? this.bestPos.filter((v) => v > 0.5).length
      : 0;
    const accuracy = Math.min(99.5, (1 - this.bestFitness) * 100);
    return {
      bestFitness: this.bestFitness,
      featuresSelected: selected,
      bestPos: this.bestPos,
      history: this.history,
      timeMs: this.timeMs,
      accuracy,
    };
  }
}
