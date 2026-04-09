// Fitness function for feature selection in anomaly detection
// Models the objective: f(X) = α·E(X) + β·(|R|/|N|) from Khayyat (2023), Eq. (5)

// Build fitness function for a given feature space
// relevantCount: number of truly informative features (indices 0..relevantCount-1)
function createFitnessFunction(totalFeatures, relevantCount) {
    // Assign relevance weights — relevant features contribute more to accuracy
    const weights = Array.from({ length: totalFeatures }, (_, i) =>
        i < relevantCount ? 1.0 + 0.3 * Math.sin(i * 1.7) : 0.05 * Math.random()
    );

    const alpha = 0.9; // weight for classification error
    const beta = 0.1; // weight for feature reduction ratio

    return function (position) {
        // Binarize continuous position to feature mask
        const mask = position.map(v => v > 0.5 ? 1 : 0);
        const nSelected = mask.reduce((s, v) => s + v, 0);

        if (nSelected === 0) return 1.0; // no features selected — worst case

        // Compute weighted relevance score of selected feature subset
        let relevance = 0;
        for (let i = 0; i < totalFeatures; i++) {
            if (mask[i]) relevance += weights[i];
        }

        // Normalize relevance against ideal (all relevant features selected)
        const maxRelevance = weights.slice(0, relevantCount).reduce((s, w) => s + w, 0);
        const normalizedRelevance = Math.min(1, relevance / maxRelevance);

        // Simulate classification accuracy with controlled noise for realism
        const noise = (Math.random() - 0.5) * 0.015;
        const baseAcc = 0.72 + 0.26 * normalizedRelevance + noise;
        const errorRate = Math.max(0, 1 - baseAcc);

        // Apply fitness formula from paper: f(X) = α·E(X) + β·(|R|/|N|)
        return alpha * errorRate + beta * (nSelected / totalFeatures);
    };
}

// Convert fitness value to classification accuracy percentage
function fitnessToAccuracy(fitness, alpha = 0.9) {
    const errorRate = Math.max(0, fitness / alpha);
    return Math.min(99.9, (1 - errorRate) * 100);
}

// Estimate selected features from a history's final best position
function countSelected(position, threshold = 0.5) {
    return position ? position.filter(v => v > threshold).length : 0;
}