// Standard Bacterial Foraging Optimization (BFO)
// Baseline algorithm for feature selection in anomaly detection
class BFO {
    constructor(config) {
        this.M = config.M || 20;   // population size
        this.Nc = config.Nc || 40;   // chemotaxis steps
        this.Nre = config.Nre || 4;    // reproduction cycles
        this.Ned = config.Ned || 2;    // elimination-dispersal cycles
        this.Ns = config.Ns || 4;    // swim length
        this.Ped = config.Ped || 0.25; // elimination probability
        this.C = config.C || 0.1;  // step size
        this.dim = config.dim || 20;   // feature dimension
        this.fitness = config.fitness; // fitness function reference

        this.bacteria = this._init();
        this.bestFitness = Infinity;
        this.bestPos = null;
        this.history = [];         // best fitness per chemotaxis step
        this.timeMs = 0;
    }

    // Initialize bacteria positions uniformly in [0, 1]^dim
    _init() {
        return Array.from({ length: this.M }, () =>
            Array.from({ length: this.dim }, () => Math.random())
        );
    }

    // Tumble: generate a random unit vector for direction
    _tumble() {
        const d = Array.from({ length: this.dim }, () => Math.random() * 2 - 1);
        const norm = Math.sqrt(d.reduce((s, v) => s + v * v, 0)) || 1;
        return d.map(v => v / norm);
    }

    // Move a bacterium one step in direction dir, clamped to [0, 1]
    _move(pos, dir) {
        return pos.map((x, i) => Math.max(0, Math.min(1, x + this.C * dir[i])));
    }

    // Run the full BFO optimization loop
    run() {
        const t0 = performance.now();

        for (let l = 0; l < this.Ned; l++) {
            for (let k = 0; k < this.Nre; k++) {
                const health = new Array(this.M).fill(0);

                for (let j = 0; j < this.Nc; j++) {
                    for (let i = 0; i < this.M; i++) {
                        let fitOld = this.fitness(this.bacteria[i]);
                        health[i] += fitOld;

                        const dir = this._tumble();
                        let newPos = this._move(this.bacteria[i], dir);
                        let fitNew = this.fitness(newPos);

                        // Swim only when fitness improves (greedy acceptance — BFO limitation)
                        let m = 0;
                        while (fitNew < fitOld && m < this.Ns) {
                            this.bacteria[i] = newPos;
                            fitOld = fitNew;
                            health[i] += fitOld;
                            newPos = this._move(this.bacteria[i], dir);
                            fitNew = this.fitness(newPos);
                            m++;
                        }

                        if (fitOld < this.bestFitness) {
                            this.bestFitness = fitOld;
                            this.bestPos = [...this.bacteria[i]];
                        }
                    }

                    this.history.push(this.bestFitness);
                }

                // Reproduction: retain top half, clone them to fill population
                const ranked = health
                    .map((h, i) => ({ h, i }))
                    .sort((a, b) => a.h - b.h);
                const keepers = ranked.slice(0, this.M / 2).map(o => this.bacteria[o.i]);
                this.bacteria = [
                    ...keepers.map(b => [...b]),
                    ...keepers.map(b => [...b])
                ];
            }

            // Elimination-dispersal: randomly reinitialize bacteria with probability Ped
            for (let i = 0; i < this.M; i++) {
                if (Math.random() < this.Ped) {
                    this.bacteria[i] = Array.from({ length: this.dim }, () => Math.random());
                }
            }
        }

        this.timeMs = performance.now() - t0;
        return this._result();
    }

    // Compute and return final result metrics
    _result() {
        const selected = this.bestPos
            ? this.bestPos.filter(v => v > 0.5).length
            : 0;
        const accuracy = Math.min(99.5, (1 - this.bestFitness) * 100);
        return {
            bestFitness: this.bestFitness,
            featuresSelected: selected,
            history: this.history,
            timeMs: this.timeMs,
            accuracy
        };
    }
}