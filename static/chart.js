/* static/chart.js */
/* Management of Chart.js Instances for Optimization Analytics */

// Global Chart Instances
let charts = {
    convergence: null,
    saCooling: null,
    saAcceptance: null,
    gaEvolution: null,
    compareFitness: null,
    compareTime: null
};

// Theme configurations helper
function getChartColors() {
    const isLight = document.body.classList.contains('light-mode');
    return {
        gridColor: isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.08)',
        textColor: isLight ? '#475569' : '#94a3b8',
        tooltipBg: isLight ? '#0f172a' : '#1e293b',
        tooltipText: isLight ? '#f8fafc' : '#f1f5f9'
    };
}

// Destroy helper to prevent overlap bugs
function destroyChart(name) {
    if (charts[name]) {
        charts[name].destroy();
        charts[name] = null;
    }
}

/**
 * ── 1. CONVERGENCE / FITNESS HISTORY CHART ─────────────────────
 */
function updateConvergenceChart(data, isComparison = false) {
    destroyChart('convergence');
    const ctx = document.getElementById('chartConvergence').getContext('2d');
    const themeColors = getChartColors();
    
    let datasets = [];
    
    if (isComparison) {
        // Compare Mode: Plot lines for all 5 variations
        const algos = {
            simple_hc: { label: 'Simple HC', color: '#60a5fa' },
            steepest_hc: { label: 'Steepest-Ascent HC', color: '#c084fc' },
            stochastic_hc: { label: 'Stochastic HC', color: '#f472b6' },
            simulated_annealing: { label: 'Simulated Annealing', color: '#fbbf24' },
            genetic_algorithm: { label: 'Genetic Algorithm', color: '#34d399' }
        };
        
        Object.keys(algos).forEach(key => {
            if (data[key] && data[key].history) {
                datasets.push({
                    label: algos[key].label,
                    data: data[key].history,
                    borderColor: algos[key].color,
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0,
                    tension: 0.1
                });
            }
        });
    } else {
        // Single Mode: Plot one line
        datasets.push({
            label: data.algorithm,
            data: data.history,
            borderColor: '#3b82f6',
            borderWidth: 2.5,
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            pointRadius: data.history.length < 100 ? 2 : 0,
            tension: 0.15
        });
    }
    
    // Label sum
    const maxLen = datasets.reduce((max, d) => Math.max(max, d.data.length), 0);
    const labels = Array.from({ length: maxLen }, (_, i) => i);
    
    charts.convergence = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: themeColors.textColor, font: { family: 'Outfit' } }
                },
                tooltip: {
                    backgroundColor: themeColors.tooltipBg,
                    titleColor: themeColors.tooltipText,
                    bodyColor: themeColors.tooltipText,
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    grid: { color: themeColors.gridColor },
                    ticks: { color: themeColors.textColor, maxTicksLimit: 12 },
                    title: { display: true, text: 'Iterasi / Generasi', color: themeColors.textColor }
                },
                y: {
                    grid: { color: themeColors.gridColor },
                    ticks: { color: themeColors.textColor },
                    title: { display: true, text: 'Nilai Fitness (Delay)', color: themeColors.textColor }
                }
            }
        }
    });
}

/**
 * ── 2. SIMULATED ANNEALING DIAGNOSTIC CHARTS ───────────────────
 */
function updateSACharts(tempHistory, acceptHistory, worseAccepted) {
    const themeColors = getChartColors();
    
    // Suhu Cooling Curve
    destroyChart('saCooling');
    const ctxCool = document.getElementById('chartSACooling').getContext('2d');
    charts.saCooling = new Chart(ctxCool, {
        type: 'line',
        data: {
            labels: Array.from({ length: tempHistory.length }, (_, i) => i),
            datasets: [{
                label: 'Suhu (Temperature)',
                data: tempHistory,
                borderColor: '#ef4444',
                borderWidth: 2,
                fill: false,
                pointRadius: 0,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: themeColors.textColor } }
            },
            scales: {
                x: {
                    grid: { color: themeColors.gridColor },
                    ticks: { color: themeColors.textColor, maxTicksLimit: 8 },
                    title: { display: true, text: 'Iterasi', color: themeColors.textColor }
                },
                y: {
                    grid: { color: themeColors.gridColor },
                    ticks: { color: themeColors.textColor },
                    title: { display: true, text: 'Suhu (T)', color: themeColors.textColor }
                }
            }
        }
    });
    
    // Worse solution Boltzmann acceptance scatter plot
    destroyChart('saAcceptance');
    const ctxAcc = document.getElementById('chartSAAcceptance').getContext('2d');
    
    // Pisahkan yang diterima vs ditolak
    const acceptedPoints = worseAccepted.filter(p => p.accepted).map(p => ({ x: p.iteration, y: p.p_accept }));
    const rejectedPoints = worseAccepted.filter(p => !p.accepted).map(p => ({ x: p.iteration, y: p.p_accept }));
    
    charts.saAcceptance = new Chart(ctxAcc, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'Solusi Buruk Diterima',
                    data: acceptedPoints,
                    backgroundColor: '#10b981', // green
                    pointRadius: 5
                },
                {
                    label: 'Solusi Buruk Ditolak',
                    data: rejectedPoints,
                    backgroundColor: '#ef4444', // red
                    pointRadius: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: themeColors.textColor } },
                tooltip: {
                    backgroundColor: themeColors.tooltipBg,
                    titleColor: themeColors.tooltipText,
                    bodyColor: themeColors.tooltipText
                }
            },
            scales: {
                x: {
                    grid: { color: themeColors.gridColor },
                    ticks: { color: themeColors.textColor },
                    title: { display: true, text: 'Nomor Iterasi', color: themeColors.textColor }
                },
                y: {
                    grid: { color: themeColors.gridColor },
                    ticks: { color: themeColors.textColor },
                    title: { display: true, text: 'Probabilitas Boltzmann (P)', color: themeColors.textColor },
                    min: 0,
                    max: 1.05
                }
            }
        }
    });
}

/**
 * ── 3. GENETIC ALGORITHM EVOLUTION CHART ───────────────────────
 */
function updateGACharts(bestHistory, avgHistory) {
    destroyChart('gaEvolution');
    const ctx = document.getElementById('chartGAEvolution').getContext('2d');
    const themeColors = getChartColors();
    
    charts.gaEvolution = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({ length: bestHistory.length }, (_, i) => i),
            datasets: [
                {
                    label: 'Fitness Terbaik (Elit)',
                    data: bestHistory,
                    borderColor: '#10b981',
                    borderWidth: 2.5,
                    backgroundColor: 'rgba(16, 185, 129, 0.05)',
                    fill: true,
                    pointRadius: 0,
                    tension: 0.1
                },
                {
                    label: 'Rata-rata Populasi',
                    data: avgHistory,
                    borderColor: '#3b82f6',
                    borderWidth: 1.5,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: themeColors.textColor } }
            },
            scales: {
                x: {
                    grid: { color: themeColors.gridColor },
                    ticks: { color: themeColors.textColor, maxTicksLimit: 10 },
                    title: { display: true, text: 'Generasi', color: themeColors.textColor }
                },
                y: {
                    grid: { color: themeColors.gridColor },
                    ticks: { color: themeColors.textColor },
                    title: { display: true, text: 'Fitness (Delay)', color: themeColors.textColor }
                }
            }
        }
    });
}

/**
 * ── 4. MULTI-ALGORITHM SIDE-BY-SIDE COMPARISON CARDS ──────────
 */
function updateComparisonCharts(results) {
    const themeColors = getChartColors();
    
    const labels = [
        'Simple HC',
        'Steepest HC',
        'Stochastic HC',
        'Simulated Annealing',
        'Genetic Algorithm'
    ];
    
    const keys = ['simple_hc', 'steepest_hc', 'stochastic_hc', 'simulated_annealing', 'genetic_algorithm'];
    
    // Data Fitness
    const fitnessData = keys.map(k => results[k] ? results[k].best_fitness : 0);
    // Data Waktu (ms)
    const timeData = keys.map(k => results[k] ? results[k].time_ms : 0);
    
    // Bar Chart Kualitas Solusi (Fitness)
    destroyChart('compareFitness');
    const ctxFit = document.getElementById('chartCompareFitness').getContext('2d');
    charts.compareFitness = new Chart(ctxFit, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Kualitas Solusi (Kecil = Baik)',
                data: fitnessData,
                backgroundColor: [
                    'rgba(96, 165, 250, 0.7)',
                    'rgba(192, 132, 252, 0.7)',
                    'rgba(244, 114, 182, 0.7)',
                    'rgba(251, 191, 36, 0.7)',
                    'rgba(52, 211, 153, 0.7)'
                ],
                borderColor: [
                    '#60a5fa', '#c084fc', '#f472b6', '#fbbf24', '#34d399'
                ],
                borderWidth: 1.5,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: themeColors.textColor, font: { size: 9 } }
                },
                y: {
                    grid: { color: themeColors.gridColor },
                    ticks: { color: themeColors.textColor },
                    title: { display: true, text: 'Nilai Fitness Akhir', color: themeColors.textColor }
                }
            }
        }
    });
    
    // Bar Chart Waktu Pemrosesan (ms)
    destroyChart('compareTime');
    const ctxTime = document.getElementById('chartCompareTime').getContext('2d');
    charts.compareTime = new Chart(ctxTime, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Waktu Proses (Cepat = Baik)',
                data: timeData,
                backgroundColor: [
                    'rgba(96, 165, 250, 0.7)',
                    'rgba(192, 132, 252, 0.7)',
                    'rgba(244, 114, 182, 0.7)',
                    'rgba(251, 191, 36, 0.7)',
                    'rgba(52, 211, 153, 0.7)'
                ],
                borderColor: [
                    '#60a5fa', '#c084fc', '#f472b6', '#fbbf24', '#34d399'
                ],
                borderWidth: 1.5,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: themeColors.textColor, font: { size: 9 } }
                },
                y: {
                    grid: { color: themeColors.gridColor },
                    ticks: { color: themeColors.textColor },
                    title: { display: true, text: 'Waktu Eksekusi (ms)', color: themeColors.textColor }
                }
            }
        }
    });
}
