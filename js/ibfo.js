// Improved Bacterial Foraging Optimization (IBFO) — enhanced algorithm.
// Extends standard BFO by integrating Simulated Annealing (SA) into the
// chemotaxis step via the Metropolis condition (Khayyat, 2023).
//
// Core enhancement over BFO:
//   Worse solutions are accepted with probability exp(−ΔE / T), where T is
//   the current temperature.  This probabilistic acceptance allows IBFO to
//   escape local optima that trap the greedy BFO, yielding convergence closer
//   to the global optimum (Khayyat, 2023).

class IBFO extends BFO {
  // config — all BFO fields plus SA-specific parameters:
  //   T0      — initial SA temperature (exploration level at start)
  //   cooling — multiplicative cooling rate α; T ← T · α each chemotaxis step
  constructor(config) {
    super(config);
    this.T0 = config.T0 || 1.0;
    this.cooling = config.cooling || 0.96;
  }

  // IBFO optimization loop — identical outer structure to BFO but with
  // Metropolis acceptance replacing the greedy accept-only-if-better rule.
  run() {
    const t0 = performance.now();
    let T = this.T0; // current SA temperature; decreases geometrically

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
            const newPos = this._move(this.bacteria[i], dir);
            const fitNew = this.fitness(newPos);
            const deltaE = fitNew - fitOld; // ΔE = change in fitness

            // Metropolis condition (SA): accept a worse solution with
            // probability exp(−ΔE / T).  When T is high, exploration
            // dominates; as T cools, IBFO converges like BFO.
            if (deltaE < 0 || Math.random() < Math.exp(-deltaE / T)) {
              this.bacteria[i] = newPos;
              fitOld = fitNew;
            }

            health[i] += fitOld;

            // Swim from accepted position while fitness continues to improve.
            let m = 0;
            while (m < this.Ns) {
              const swimPos = this._move(this.bacteria[i], dir);
              const swimFit = this.fitness(swimPos);
              if (swimFit < fitOld) {
                this.bacteria[i] = swimPos;
                fitOld = swimFit;
                health[i] += fitOld;
              } else {
                break;
              }
              m++;
            }

            // Track global best.
            if (fitOld < this.bestFitness) {
              this.bestFitness = fitOld;
              this.bestPos = [...this.bacteria[i]];
            }
          }

          // Apply geometric cooling schedule: T ← T · α.
          T *= this.cooling;
          this.history.push(this.bestFitness);
        }

        // Reproduction: identical to BFO — rank by health, clone top half.
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

      // Elimination-dispersal: identical to BFO.
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
}
