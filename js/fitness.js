// Fitness function for feature selection in anomaly detection.
// Models the objective from Khayyat (2023), Eq. (5):
//   Fitness(X) = α · E(X) + β · (|R| / |N|)
// where E(X) is the classification error rate of subset X,
// |R| is the number of selected features, |N| is the total feature count,
// and α + β = 1 (α weights error rate; β weights the reduction ratio).

// Build a deterministic-seeded fitness function for a given feature space.
// relevantCount: number of truly informative features (indices 0 … relevantCount-1).
function createFitnessFunction(totalFeatures, relevantCount) {
  // Assign fixed relevance weights per feature.
  // Relevant features receive higher weights; irrelevant ones are near-zero.
  const weights = Array.from(
    { length: totalFeatures },
    (_, i) =>
      i < relevantCount
        ? 1.0 + 0.3 * Math.sin(i * 1.7) // informative: weight ≈ 0.7 – 1.3
        : 0.04 + 0.02 * (i % 5), // noise: weight ≈ 0.04 – 0.12
  );

  // Maximum possible relevance (all relevant features selected).
  const maxRelevance = weights
    .slice(0, relevantCount)
    .reduce((s, w) => s + w, 0);

  // α and β from Khayyat (2023): α = 0.9 (error weight), β = 0.1 (reduction weight).
  const alpha = 0.9;
  const beta = 0.1;

  return function fitness(position) {
    // Binarize continuous position vector to a 0/1 feature mask.
    const mask = position.map((v) => (v > 0.5 ? 1 : 0));
    const nSelected = mask.reduce((s, v) => s + v, 0);

    // No features selected — worst possible fitness.
    if (nSelected === 0) return 1.0;

    // Compute weighted relevance of the selected subset.
    let relevance = 0;
    for (let i = 0; i < totalFeatures; i++) {
      if (mask[i]) relevance += weights[i];
    }

    // Normalize relevance against the ideal (all informative features chosen).
    const normalizedRelevance = Math.min(1, relevance / maxRelevance);

    // Simulate base classification accuracy from feature quality.
    // Small Gaussian noise (Box-Muller) adds realistic stochasticity.
    const u1 = Math.random(),
      u2 = Math.random();
    const noise =
      Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2) * 0.008;
    const baseAcc = 0.74 + 0.24 * normalizedRelevance + noise;
    const errorRate = Math.max(0, 1 - Math.min(1, baseAcc));

    // Apply paper fitness formula: f(X) = α · E(X) + β · (|R| / |N|).
    return alpha * errorRate + beta * (nSelected / totalFeatures);
  };
}

// Convert a raw fitness value to an estimated classification accuracy percentage.
// Inverts the dominant α · E(X) term from Eq. (5).
function fitnessToAccuracy(fitness, alpha = 0.9) {
  const errorRate = Math.max(0, fitness / alpha);
  return Math.min(99.9, (1 - errorRate) * 100);
}

// Count the number of selected features given a continuous position vector.
function countSelected(position, threshold = 0.5) {
  return position ? position.filter((v) => v > threshold).length : 0;
}
