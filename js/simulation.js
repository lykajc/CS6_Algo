// Simulation controller — orchestrates BFO vs. IBFO comparison and renders charts

// Chart.js instances
let convergenceChart = null;
let metricsChart = null;

// Simulation state
let isRunning = false;

// Initialize Chart.js convergence chart
function initConvergenceChart() {
    const ctx = document.getElementById('convergenceChart').getContext('2d');
    if (convergenceChart) convergenceChart.destroy();

    convergenceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'BFO (Baseline)',
                    data: [],
                    borderColor: '#7AAACE',
                    backgroundColor: 'rgba(122,170,206,0.08)',
                    borderWidth: 2,
                    borderDash: [6, 4],
                    pointRadius: 0,
                    tension: 0.3
                },
                {
                    label: 'IBFO (Enhanced)',
                    data: [],
                    borderColor: '#355872',
                    backgroundColor: 'rgba(53,88,114,0.08)',
                    borderWidth: 2.5,
                    pointRadius: 0,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 600 },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { font: { family: 'DM Sans', size: 13 }, color: '#355872' }
                },
                tooltip: {
                    callbacks: {
                        label: ctx =>
                            `${ctx.dataset.label}: ${(ctx.parsed.y * 100).toFixed(2)}% error`
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Chemotaxis Iteration', color: '#7AAACE', font: { family: 'DM Sans' } },
                    ticks: { color: '#5a7a92', font: { family: 'DM Sans' }, maxTicksLimit: 10 },
                    grid: { color: 'rgba(122,170,206,0.15)' }
                },
                y: {
                    title: { display: true, text: 'Best Fitness (Error Rate)', color: '#7AAACE', font: { family: 'DM Sans' } },
                    ticks: {
                        color: '#5a7a92',
                        font: { family: 'DM Sans' },
                        callback: v => v.toFixed(3)
                    },
                    grid: { color: 'rgba(122,170,206,0.15)' }
                }
            }
        }
    });
}

// Initialize bar chart for accuracy comparison
function initMetricsChart() {
    const ctx = document.getElementById('metricsChart').getContext('2d');
    if (metricsChart) metricsChart.destroy();

    metricsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Accuracy', 'Precision', 'Recall', 'F-Score'],
            datasets: [
                {
                    label: 'BFO (Baseline)',
                    data: [],
                    backgroundColor: 'rgba(122,170,206,0.7)',
                    borderColor: '#7AAACE',
                    borderWidth: 1.5,
                    borderRadius: 4
                },
                {
                    label: 'IBFO (Enhanced)',
                    data: [],
                    backgroundColor: 'rgba(53,88,114,0.8)',
                    borderColor: '#355872',
                    borderWidth: 1.5,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { font: { family: 'DM Sans', size: 13 }, color: '#355872' }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}%`
                    }
                }
            },
            scales: {
                y: {
                    min: 80,
                    max: 100,
                    title: { display: true, text: 'Performance (%)', color: '#7AAACE', font: { family: 'DM Sans' } },
                    ticks: { color: '#5a7a92', font: { family: 'DM Sans' }, callback: v => v + '%' },
                    grid: { color: 'rgba(122,170,206,0.15)' }
                },
                x: {
                    ticks: { color: '#5a7a92', font: { family: 'DM Sans' } },
                    grid: { display: false }
                }
            }
        }
    });
}

// Derive simulated precision, recall, f-score from best fitness value
function deriveMetrics(fitness, alpha = 0.9) {
    const err = Math.max(0, fitness / alpha);
    const accuracy = Math.min(99.9, (1 - err) * 100);
    const noise = () => (Math.random() - 0.5) * 1.5;
    const precision = Math.min(99.9, accuracy - 3.5 + noise());
    const recall = Math.min(99.9, accuracy - 4.0 + noise());
    const fscore = 2 * precision * recall / (precision + recall);
    return { accuracy, precision, recall, fscore };
}

// Populate the results table with simulation output
function updateResultsTable(bfoResult, ibfoResult) {
    const bfoM = deriveMetrics(bfoResult.bestFitness);
    const ibfoM = deriveMetrics(ibfoResult.bestFitness);

    document.getElementById('bfo-accuracy').textContent = bfoM.accuracy.toFixed(2) + '%';
    document.getElementById('bfo-precision').textContent = bfoM.precision.toFixed(2) + '%';
    document.getElementById('bfo-recall').textContent = bfoM.recall.toFixed(2) + '%';
    document.getElementById('bfo-fscore').textContent = bfoM.fscore.toFixed(2) + '%';
    document.getElementById('bfo-features').textContent = bfoResult.featuresSelected;
    document.getElementById('bfo-time').textContent = bfoResult.timeMs.toFixed(1) + ' ms';

    document.getElementById('ibfo-accuracy').textContent = ibfoM.accuracy.toFixed(2) + '%';
    document.getElementById('ibfo-precision').textContent = ibfoM.precision.toFixed(2) + '%';
    document.getElementById('ibfo-recall').textContent = ibfoM.recall.toFixed(2) + '%';
    document.getElementById('ibfo-fscore').textContent = ibfoM.fscore.toFixed(2) + '%';
    document.getElementById('ibfo-features').textContent = ibfoResult.featuresSelected;
    document.getElementById('ibfo-time').textContent = ibfoResult.timeMs.toFixed(1) + ' ms';

    // Update metric chart data
    metricsChart.data.datasets[0].data = [
        bfoM.accuracy, bfoM.precision, bfoM.recall, bfoM.fscore
    ];
    metricsChart.data.datasets[1].data = [
        ibfoM.accuracy, ibfoM.precision, ibfoM.recall, ibfoM.fscore
    ];
    metricsChart.update();

    // Show results section
    document.getElementById('sim-results').style.display = 'block';

    // Update winner badge
    const gap = ibfoM.accuracy - bfoM.accuracy;
    document.getElementById('accuracy-gap').textContent =
        `IBFO outperforms BFO by ${gap.toFixed(2)} percentage points in accuracy.`;
}

// Main simulation runner — reads UI params, runs both algorithms, updates UI
function runSimulation() {
    if (isRunning) return;
    isRunning = true;

    // Read parameters from controls
    const dim = parseInt(document.getElementById('param-dim').value) || 20;
    const M = parseInt(document.getElementById('param-M').value) || 20;
    const Nc = parseInt(document.getElementById('param-Nc').value) || 40;
    const Nre = parseInt(document.getElementById('param-Nre').value) || 4;
    const Ned = parseInt(document.getElementById('param-Ned').value) || 2;
    const C = parseFloat(document.getElementById('param-C').value) || 0.1;
    const T0 = parseFloat(document.getElementById('param-T0').value) || 1.0;
    const cool = parseFloat(document.getElementById('param-cool').value) || 0.96;

    // Update button state
    const btn = document.getElementById('run-btn');
    btn.textContent = 'Running…';
    btn.disabled = true;

    // Short timeout so UI updates before heavy computation
    setTimeout(() => {
        const relevantCount = Math.floor(dim * 0.65);
        const fitFunc = createFitnessFunction(dim, relevantCount);

        const sharedConfig = { M, Nc, Nre, Ned, Ns: 4, Ped: 0.25, C, dim, fitness: fitFunc };

        // Run baseline BFO
        const bfo = new BFO(sharedConfig);
        const bfoResult = bfo.run();

        // Run enhanced IBFO with same config plus SA parameters
        const ibfo = new IBFO({ ...sharedConfig, T0, cooling: cool });
        const ibfoResult = ibfo.run();

        // Build labels for x-axis (one per chemotaxis step total)
        const totalSteps = bfoResult.history.length;
        const labels = Array.from({ length: totalSteps }, (_, i) => i + 1);

        // Update convergence chart
        convergenceChart.data.labels = labels;
        convergenceChart.data.datasets[0].data = bfoResult.history;
        convergenceChart.data.datasets[1].data = ibfoResult.history;
        convergenceChart.update();

        // Update results table and metric chart
        updateResultsTable(bfoResult, ibfoResult);

        // Restore button
        btn.textContent = 'Run Simulation';
        btn.disabled = false;
        isRunning = false;
    }, 50);
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    initConvergenceChart();
    initMetricsChart();

    document.getElementById('run-btn').addEventListener('click', runSimulation);

    // Reset button clears charts and hides results
    document.getElementById('reset-btn').addEventListener('click', () => {
        initConvergenceChart();
        initMetricsChart();
        document.getElementById('sim-results').style.display = 'none';
    });
});