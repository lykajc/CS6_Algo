// Improved Bacterial Foraging Optimization (IBFO) with Simulated Annealing
// Enhanced algorithm — key improvement over standard BFO (Khayyat, 2023)
class IBFO extends BFO {
    constructor(config) {
        super(config);
        this.T0 = config.T0 || 1.0;  // initial SA temperature
        this.cooling = config.cooling || 0.96; // SA cooling rate (per chemotaxis step)
    }

    // Run IBFO — identical structure to BFO but with SA acceptance in chemotaxis
    run() {
        const t0 = performance.now();
        let T = this.T0; // current temperature

        for (let l = 0; l < this.Ned; l++) {
            for (let k = 0; k < this.Nre; k++) {
                const health = new Array(this.M).fill(0);

                for (let j = 0; j < this.Nc; j++) {
                    for (let i = 0; i < this.M; i++) {
                        let fitOld = this.fitness(this.bacteria[i]);
                        health[i] += fitOld;

                        const dir = this._tumble();
                        const newPos = this._move(this.bacteria[i], dir);
                        const fitNew = this.fitness(newPos);
                        const deltaE = fitNew - fitOld;

                        // Metropolis condition: accept better OR accept worse with SA probability
                        // This allows IBFO to escape local optima — the core enhancement over BFO
                        if (deltaE < 0 || Math.random() < Math.exp(-deltaE / T)) {
                            this.bacteria[i] = newPos;
                            fitOld = fitNew;
                            health[i] += fitOld;
                        }

                        // Swim from accepted position if fitness continues to improve
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

                        if (fitOld < this.bestFitness) {
                            this.bestFitness = fitOld;
                            this.bestPos = [...this.bacteria[i]];
                        }
                    }

                    // Reduce temperature after each chemotaxis step (annealing schedule)
                    T *= this.cooling;
                    this.history.push(this.bestFitness);
                }

                // Reproduction: same as BFO — sort by accumulated health, clone top half
                const ranked = health
                    .map((h, i) => ({ h, i }))
                    .sort((a, b) => a.h - b.h);
                const keepers = ranked.slice(0, this.M / 2).map(o => this.bacteria[o.i]);
                this.bacteria = [
                    ...keepers.map(b => [...b]),
                    ...keepers.map(b => [...b])
                ];
            }

            // Elimination-dispersal: same as BFO
            for (let i = 0; i < this.M; i++) {
                if (Math.random() < this.Ped) {
                    this.bacteria[i] = Array.from({ length: this.dim }, () => Math.random());
                }
            }
        }

        this.timeMs = performance.now() - t0;
        return this._result();
    }
}