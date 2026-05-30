/* static/script.js */
/* Main UI Controller & HTML5 Canvas Intersection Simulation */

// Global state variables
let appMode = "interactive"; // interactive | historical
let currentSolution = [30.0, 30.0, 30.0, 30.0]; // Default [Utara, Selatan, Timur, Barat]
let activeAlgorithmData = null;

// Simulation parameters
let simSpeed = 1.0;
let simTime = 0;
let currentPhase = 0; // 0: Utara, 1: Selatan, 2: Timur, 3: Barat
let phaseState = "green"; // green | amber | red
let phaseTimer = 10; // Timer dalam detik untuk fase saat ini

// Canvas variables
let canvas = null;
let ctx = null;
let vehicles = [];

// Spawner rate counters (semakin kecil = spawn lebih cepat)
let spawnTimers = [0, 0, 0, 0];

// Spawning bounds / Stop lines
const stopLines = {
    0: 220, // Utara (bergerak ke Selatan, berhenti di y=220)
    1: 380, // Selatan (bergerak ke Utara, berhenti di y=380)
    2: 380, // Timur (bergerak ke Barat, berhenti di x=380)
    3: 220  // Barat (bergerak ke Timur, berhenti di x=220)
};

// Lane coordinates (Centers)
const lanes = {
    0: 275, // Utara (lajur kiri ke Selatan)
    1: 325, // Selatan (lajur kanan ke Utara)
    2: 275, // Timur (lajur kiri ke Barat)
    3: 325  // Barat (lajur kanan ke Timur)
};

// Class Vehicle
class Vehicle {
    constructor(direction) {
        this.direction = direction; // 0: Utara, 1: Selatan, 2: Timur, 3: Barat
        this.width = 14;
        this.height = 24;
        this.speed = 2.2;
        this.color = this.getRandomColor();
        this.isStopped = false;
        
        // Inisialisasi posisi berdasarkan arah datang
        if (direction === 0) { // Utara ke Selatan
            this.x = lanes[0];
            this.y = -30;
            this.vx = 0;
            this.vy = this.speed;
        } else if (direction === 1) { // Selatan ke Utara
            this.x = lanes[1];
            this.y = 630;
            this.vx = 0;
            this.vy = -this.speed;
            this.height = 24;
        } else if (direction === 2) { // Timur ke Barat
            this.x = 630;
            this.y = lanes[2];
            this.vx = -this.speed;
            this.vy = 0;
            this.width = 24;
            this.height = 14;
        } else if (direction === 3) { // Barat ke Timur
            this.x = -30;
            this.y = lanes[3];
            this.vx = this.speed;
            this.vy = 0;
            this.width = 24;
            this.height = 14;
        }
    }
    
    getRandomColor() {
        // Neon color palette matching direction labels
        const colors = {
            0: "#60a5fa", // Utara: Blue
            1: "#c084fc", // Selatan: Purple
            2: "#f472b6", // Timur: Pink
            3: "#fbbf24"  // Barat: Amber
        };
        return colors[this.direction];
    }
    
    update(lightState, carsInFront) {
        // Cari mobil terdekat di depan untuk menghindari tabrakan
        let closestDist = 9999;
        carsInFront.forEach(other => {
            if (other === this) return;
            let dist;
            if (this.direction === 0) dist = other.y - (this.y + this.height);
            else if (this.direction === 1) dist = this.y - (other.y + other.height);
            else if (this.direction === 2) dist = this.x - (other.x + other.width);
            else if (this.direction === 3) dist = other.x - (this.x + this.width);
            
            if (dist > 0 && dist < closestDist) {
                closestDist = dist;
            }
        });
        
        let shouldStop = false;
        
        // Aturan Lampu Merah / Amber
        if (lightState === "red" || lightState === "amber") {
            const margin = Math.max(6, this.speed * simSpeed + 2); // Dynamic safety margin
            if (this.direction === 0 && this.y + this.height <= stopLines[0] && this.y + this.height + margin >= stopLines[0]) {
                shouldStop = true;
            } else if (this.direction === 1 && this.y >= stopLines[1] && this.y - margin <= stopLines[1]) {
                shouldStop = true;
            } else if (this.direction === 2 && this.x >= stopLines[2] && this.x - margin <= stopLines[2]) {
                shouldStop = true;
            } else if (this.direction === 3 && this.x + this.width <= stopLines[3] && this.x + this.width + margin >= stopLines[3]) {
                shouldStop = true;
            }
        }
        
        // Jarak aman ke mobil di depan (bumper-to-bumper queueing - packed tightly!)
        if (closestDist < 10) {
            shouldStop = true;
        }
        
        if (shouldStop) {
            this.isStopped = true;
            this.vx = 0;
            this.vy = 0;
        } else {
            this.isStopped = false;
            // Kembalikan kecepatan normal
            if (this.direction === 0) { this.vx = 0; this.vy = this.speed; }
            else if (this.direction === 1) { this.vx = 0; this.vy = -this.speed; }
            else if (this.direction === 2) { this.vx = -this.speed; this.vy = 0; }
            else if (this.direction === 3) { this.vx = this.speed; this.vy = 0; }
        }
        
        this.x += this.vx * simSpeed;
        this.y += this.vy * simSpeed;
    }
    
    draw() {
        ctx.fillStyle = this.color;
        ctx.shadowBlur = this.isStopped ? 0 : 6;
        ctx.shadowColor = this.color;
        
        // Gambar body mobil
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 4);
        ctx.fill();
        
        // Reset shadow
        ctx.shadowBlur = 0;
        
        // Gambar aksesoris jendela mobil kecil
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        if (this.direction === 0 || this.direction === 1) { // Vertikal
            ctx.fillRect(this.x + 2, this.y + 6, this.width - 4, 4);
            ctx.fillRect(this.x + 2, this.y + 14, this.width - 4, 3);
        } else { // Horizontal
            ctx.fillRect(this.x + 6, this.y + 2, 4, this.height - 4);
            ctx.fillRect(this.x + 14, this.y + 2, 3, this.height - 4);
        }
    }
    
    isOutOfBound() {
        return (this.x < -50 || this.x > 650 || this.y < -50 || this.y > 650);
    }
}

// ── INISIALISASI WEB PAGE ─────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    // Inisialisasi Canvas
    canvas = document.getElementById("intersectionCanvas");
    ctx = canvas.getContext("2d");
    
    // Bind slider input events
    const sliderIds = ["vehNorth", "vehSouth", "vehEast", "vehWest"];
    sliderIds.forEach(id => {
        const slider = document.getElementById(id);
        const valDisp = document.getElementById(id.replace("veh", "val"));
        
        slider.addEventListener("input", () => {
            valDisp.textContent = slider.value;
        });
    });
    
    // Speed slider
    const speedSlider = document.getElementById("simSpeedSlider");
    const valSpeed = document.getElementById("valSpeed");
    speedSlider.addEventListener("input", () => {
        simSpeed = parseFloat(speedSlider.value);
        valSpeed.textContent = simSpeed.toFixed(1) + "x";
    });
    
    // Button actions
    document.getElementById("btnRandomizeVehicles").addEventListener("click", randomizeVehicles);
    document.getElementById("themeToggleBtn").addEventListener("click", toggleTheme);
    document.getElementById("btnRunOptimize").addEventListener("click", runSingleOptimization);
    document.getElementById("btnRunCompare").addEventListener("click", runComparisonOptimization);
    
    // Set parameter accordion default
    toggleAlgorithmParams();
    
    // Default Durations
    applyOptimizedDurations([25, 25, 25, 25]);
    
    // Mulai loop animasi
    requestAnimationFrame(animationLoop);
});

// ── UTILITIES FRONTEND ────────────────────────────────────────

function setMode(mode) {
    appMode = mode;
    document.getElementById("modeInteractive").classList.toggle("active", mode === "interactive");
    document.getElementById("modeHistorical").classList.toggle("active", mode === "historical");
    document.getElementById("modeDynamic").classList.toggle("active", mode === "dynamic");
    
    // Tampilkan slider di mode interaktif maupun dinamis agar terlihat perubahan realtimenya
    document.getElementById("interactiveControls").classList.toggle("active", mode === "interactive" || mode === "dynamic");
    document.getElementById("historicalControls").classList.toggle("active", mode === "historical");
    document.getElementById("dynamicControls").classList.toggle("active", mode === "dynamic");
    
    if (mode === "dynamic") {
        applyDynamicPreset();
    }
}

function applyDynamicPreset() {
    const preset = document.getElementById("selectDynamicHour").value;
    const body = document.body;
    let targetVolumes = [];
    
    if (preset === "dini_hari") {
        // 🌙 Kendaraan sedikit, malam hari
        targetVolumes = [20, 15, 25, 20];
        if (body.classList.contains("light-mode")) toggleTheme();
    } else if (preset === "jam_berangkat") {
        // 🏫 Pagi hari sibuk berangkat kerja/sekolah
        targetVolumes = [120, 100, 140, 130];
        if (!body.classList.contains("light-mode")) toggleTheme();
    } else if (preset === "jam_kerja") {
        // 🌅 Kendaraan padat, siang hari
        targetVolumes = [80, 65, 95, 85];
        if (!body.classList.contains("light-mode")) toggleTheme();
    } else if (preset === "jam_pulang") {
        // 🚗 Lalu lintas paling padat (bottleneck), siang/sore
        targetVolumes = [140, 120, 150, 145];
        if (!body.classList.contains("light-mode")) toggleTheme();
    } else if (preset === "malam_hari") {
        // 🌃 Kendaraan mulai berkurang, malam hari
        targetVolumes = [45, 30, 50, 40];
        if (body.classList.contains("light-mode")) toggleTheme();
    }
    
    // Perbarui slider secara halus (visual updates)
    const sliderIds = ["vehNorth", "vehSouth", "vehEast", "vehWest"];
    sliderIds.forEach((id, index) => {
        const slider = document.getElementById(id);
        const valDisp = document.getElementById(id.replace("veh", "val"));
        slider.value = targetVolumes[index];
        valDisp.textContent = targetVolumes[index];
    });
    
    // Otomatis jalanankan algoritma optimasi tunggal untuk menyesuaikan durasi lampu
    // dengan kondisi volume yang baru
    runSingleOptimization();
}

function randomizeVehicles() {
    const sliderIds = ["vehNorth", "vehSouth", "vehEast", "vehWest"];
    sliderIds.forEach(id => {
        const slider = document.getElementById(id);
        const valDisp = document.getElementById(id.replace("veh", "val"));
        // Range kendaraan acak 15 s/d 120
        const randVal = Math.floor(Math.random() * 105) + 15;
        slider.value = randVal;
        valDisp.textContent = randVal;
    });
}

function toggleAlgorithmParams() {
    const algo = document.getElementById("selectAlgorithm").value;
    
    // Hide all
    document.getElementById("paramsHC").classList.remove("active");
    document.getElementById("paramsSA").classList.remove("active");
    document.getElementById("paramsGA").classList.remove("active");
    
    // Show active
    if (algo.startsWith("hill_climbing")) {
        document.getElementById("paramsHC").classList.add("active");
        
        // Spesifik varian HC
        document.getElementById("steepestNeighborsDiv").style.display = (algo === "hill_climbing_steepest") ? "block" : "none";
        document.getElementById("stochasticTDiv").style.display = (algo === "hill_climbing_stochastic") ? "block" : "none";
    } else if (algo === "simulated_annealing") {
        document.getElementById("paramsSA").classList.add("active");
    } else if (algo === "genetic_algorithm") {
        document.getElementById("paramsGA").classList.add("active");
    }
}

function switchTab(tabId) {
    // Hide all tab contents
    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".tab-header").forEach(el => el.classList.remove("active"));
    
    // Show active
    document.getElementById(tabId).classList.add("active");
    
    // Active tab header highlight
    // Cari tombol yang memiliki onclick mengandung tabId
    const tabHeaders = document.querySelectorAll(".tab-header");
    tabHeaders.forEach(btn => {
        if (btn.getAttribute("onclick").includes(tabId)) {
            btn.classList.add("active");
        }
    });
}

function toggleTheme() {
    const body = document.body;
    const themeBtn = document.getElementById("themeToggleBtn");
    
    body.classList.toggle("light-mode");
    
    if (body.classList.contains("light-mode")) {
        themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i> <span>Mode Siang</span>';
    } else {
        themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i> <span>Mode Malam</span>';
    }
    
    // Re-render charts agar warnanya menyesuaikan tema baru
    if (activeAlgorithmData) {
        if (activeAlgorithmData.results) {
            // Comparative mode
            updateConvergenceChart(activeAlgorithmData.results, true);
            updateComparisonCharts(activeAlgorithmData.results);
        } else {
            // Single mode
            updateConvergenceChart(activeAlgorithmData);
            if (activeAlgorithmData.temp_history) {
                updateSACharts(activeAlgorithmData.temp_history, activeAlgorithmData.accept_history, activeAlgorithmData.worse_accepted);
            } else if (activeAlgorithmData.avg_history) {
                updateGACharts(activeAlgorithmData.best_history, activeAlgorithmData.avg_history);
            }
        }
    }
}

// ── GET USER PARAMS & RUN OPTIMIZATIONS ───────────────────────

function getCommonPayload() {
    const payload = {
        mode: appMode,
        vehicles: [
            parseInt(document.getElementById("vehNorth").value),
            parseInt(document.getElementById("vehSouth").value),
            parseInt(document.getElementById("vehEast").value),
            parseInt(document.getElementById("vehWest").value)
        ],
        hour: parseInt(document.getElementById("selectHour").value)
    };
    return payload;
}

function setButtonsLoading(isLoading, text = "Mengoptimalkan...") {
    const optBtn = document.getElementById("btnRunOptimize");
    const compBtn = document.getElementById("btnRunCompare");
    
    if (isLoading) {
        optBtn.disabled = true;
        compBtn.disabled = true;
        optBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${text}`;
    } else {
        optBtn.disabled = false;
        compBtn.disabled = false;
        optBtn.innerHTML = `<i class="fa-solid fa-play"></i> Optimasi Tunggal`;
        compBtn.innerHTML = `<i class="fa-solid fa-chart-line"></i> Bandingkan Semua`;
    }
}

async function runSingleOptimization() {
    setButtonsLoading(true);
    
    const payload = getCommonPayload();
    const algoDropdownVal = document.getElementById("selectAlgorithm").value;
    
    // Ekstraksi algoritma & varian
    if (algoDropdownVal.startsWith("hill_climbing")) {
        payload.algorithm = "hill_climbing";
        payload.variant = algoDropdownVal.replace("hill_climbing_", "");
        payload.n_iter = parseInt(document.getElementById("hcIter").value);
        payload.step = parseFloat(document.getElementById("hcStep").value);
        payload.n_neighbors = parseInt(document.getElementById("hcNeighbors").value);
        payload.T_start = parseFloat(document.getElementById("hcTStart").value);
    } else if (algoDropdownVal === "simulated_annealing") {
        payload.algorithm = "simulated_annealing";
        payload.T0 = parseFloat(document.getElementById("saT0").value);
        payload.cooling = parseFloat(document.getElementById("saCooling").value);
        payload.T_min = parseFloat(document.getElementById("saTMin").value);
        payload.step = parseFloat(document.getElementById("saStep").value);
    } else if (algoDropdownVal === "genetic_algorithm") {
        payload.algorithm = "genetic_algorithm";
        payload.pop_size = parseInt(document.getElementById("gaPop").value);
        payload.generations = parseInt(document.getElementById("gaGen").value);
        payload.cx_prob = parseFloat(document.getElementById("gaCx").value);
        payload.mut_prob = parseFloat(document.getElementById("gaMut").value);
        payload.elite_size = parseInt(document.getElementById("gaElite").value);
        payload.selection_method = document.getElementById("gaSelection").value.split(" ")[0];
    }
    
    try {
        const response = await fetch("/api/optimize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        if (response.ok) {
            activeAlgorithmData = data;
            
            // Hide trophy alert (hanya aktif di compare)
            document.getElementById("winnerAlertCard").classList.add("hidden-card");
            
            // Update hasil statistika
            document.getElementById("resFitness").textContent = data.best_fitness.toFixed(2);
            document.getElementById("resTime").textContent = data.time_ms.toFixed(1) + " ms";
            
            // Update tabel perbandingan dengan hasil single ini
            updateSingleRowTable(algoDropdownVal, data);
            
            // Terapkan lampu hijau optimal ke simulasi
            applyOptimizedDurations(data.solution);
            
            // Update Charts berdasarkan tipe algo
            updateConvergenceChart(data);
            switchTab('tabConvergence');
            
            // Atur visibilitas tab diagnostic detail
            document.getElementById("tabHeaderSA").style.display = (payload.algorithm === "simulated_annealing") ? "block" : "none";
            document.getElementById("tabHeaderGA").style.display = (payload.algorithm === "genetic_algorithm") ? "block" : "none";
            document.getElementById("tabHeaderCompare").style.display = "none";
            
            if (payload.algorithm === "simulated_annealing") {
                updateSACharts(data.temp_history, data.accept_history, data.worse_accepted);
            } else if (payload.algorithm === "genetic_algorithm") {
                updateGACharts(data.best_history, data.avg_history);
            }
        } else {
            alert("Error: " + data.error);
        }
    } catch (e) {
        console.error(e);
        alert("Gagal terhubung dengan server Flask.");
    } finally {
        setButtonsLoading(false);
    }
}

async function runComparisonOptimization() {
    setButtonsLoading(true, "Membandingkan...");
    
    const payload = getCommonPayload();
    
    // Lampirkan semua parameter form untuk kelima varian sekaligus
    payload.hc_n_iter = parseInt(document.getElementById("hcIter").value);
    payload.hc_step = parseFloat(document.getElementById("hcStep").value);
    payload.hc_n_neighbors = parseInt(document.getElementById("hcNeighbors").value);
    payload.hc_T_start = parseFloat(document.getElementById("hcTStart").value);
    
    payload.sa_T0 = parseFloat(document.getElementById("saT0").value);
    payload.sa_cooling = parseFloat(document.getElementById("saCooling").value);
    payload.sa_T_min = parseFloat(document.getElementById("saTMin").value);
    payload.sa_step = parseFloat(document.getElementById("saStep").value);
    
    payload.ga_pop_size = parseInt(document.getElementById("gaPop").value);
    payload.ga_generations = parseInt(document.getElementById("gaGen").value);
    payload.ga_cx_prob = parseFloat(document.getElementById("gaCx").value);
    payload.ga_mut_prob = parseFloat(document.getElementById("gaMut").value);
    payload.ga_elite_size = parseInt(document.getElementById("gaElite").value);
    payload.ga_selection = document.getElementById("gaSelection").value.split(" ")[0];
    
    try {
        const response = await fetch("/api/compare", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        if (response.ok) {
            activeAlgorithmData = data;
            
            // Tampilkan alert pemenang otomatis
            const alertCard = document.getElementById("winnerAlertCard");
            const winnerName = document.getElementById("winnerAlgoName");
            alertCard.classList.remove("hidden-card");
            winnerName.textContent = data.best_algorithm;
            
            // Terapkan lampu hijau optimal pemenang ke simulasi
            const bestKey = data.best_key;
            const bestSol = data.results[bestKey].solution;
            applyOptimizedDurations(bestSol);
            
            // Set Highlight stat utama (menggunakan pemenang)
            document.getElementById("resFitness").textContent = data.results[bestKey].best_fitness.toFixed(2);
            document.getElementById("resTime").textContent = data.results[bestKey].time_ms.toFixed(1) + " ms";
            
            // Update seluruh baris di tabel perbandingan
            updateFullComparisonTable(data.results);
            
            // Aktifkan tab pembanding detail
            document.getElementById("tabHeaderSA").style.display = "none";
            document.getElementById("tabHeaderGA").style.display = "none";
            document.getElementById("tabHeaderCompare").style.display = "block";
            
            // Render multi-konvergensi & comparative bars
            updateConvergenceChart(data.results, true);
            updateComparisonCharts(data.results);
            
            switchTab('tabCompare');
        } else {
            alert("Error: " + data.error);
        }
    } catch (e) {
        console.error(e);
        alert("Gagal terhubung dengan server Flask untuk perbandingan.");
    } finally {
        setButtonsLoading(false);
    }
}

function applyOptimizedDurations(durations) {
    // Batasi durasi di antara 15 dan 30 detik untuk visualisasi simulasi yang optimal
    let cappedDurations = durations.map(d => Math.max(15, Math.min(30, d)));
    currentSolution = cappedDurations; // [Utara, Selatan, Timur, Barat]
    
    // Tampilkan angka durasi optimal di dashboard status bawah
    document.getElementById("valGreenNorth").textContent = cappedDurations[0].toFixed(0) + "s";
    document.getElementById("valGreenSouth").textContent = cappedDurations[1].toFixed(0) + "s";
    document.getElementById("valGreenEast").textContent = cappedDurations[2].toFixed(0) + "s";
    document.getElementById("valGreenWest").textContent = cappedDurations[3].toFixed(0) + "s";
    
    // Reset timer simulasi agar langsung memulai siklus lampu baru dengan konfigurasi baru
    currentPhase = 0; // 0: Utara-Selatan Hijau
    phaseState = "green";
    phaseTimer = Math.max(cappedDurations[0], cappedDurations[1]); // North-South phase duration (maks 30s)
}

// ── TABLE SYNCHRONIZATION ────────────────────────────────────

function updateSingleRowTable(algoVal, data) {
    let rowId = "";
    if (algoVal === "hill_climbing_simple") rowId = "row_simple_hc";
    else if (algoVal === "hill_climbing_steepest") rowId = "row_steepest_hc";
    else if (algoVal === "hill_climbing_stochastic") rowId = "row_stochastic_hc";
    else if (algoVal === "simulated_annealing") rowId = "row_simulated_annealing";
    else if (algoVal === "genetic_algorithm") rowId = "row_genetic_algorithm";
    
    if (!rowId) return;
    
    const row = document.getElementById(rowId);
    row.querySelector(".fit-cell").textContent = data.best_fitness.toFixed(2);
    row.querySelector(".time-cell").textContent = data.time_ms.toFixed(1) + " ms";
    row.querySelector(".iter-cell").textContent = data.history.length - 1;
    row.querySelector(".sol-cell").textContent = `[${data.solution.join(", ")}]`;
    
    // Sorot baris yang baru saja dijalankan secara khusus
    document.querySelectorAll("#comparisonTable tbody tr").forEach(r => r.classList.remove("row-glow"));
    row.classList.add("row-glow");
}

function updateFullComparisonTable(results) {
    const keys = {
        simple_hc: "row_simple_hc",
        steepest_hc: "row_steepest_hc",
        stochastic_hc: "row_stochastic_hc",
        simulated_annealing: "row_simulated_annealing",
        genetic_algorithm: "row_genetic_algorithm"
    };
    
    // Hapus glow-row sebelumnya
    document.querySelectorAll("#comparisonTable tbody tr").forEach(r => r.classList.remove("row-glow"));
    
    Object.keys(keys).forEach(key => {
        if (results[key]) {
            const rowId = keys[key];
            const row = document.getElementById(rowId);
            const data = results[key];
            
            row.querySelector(".fit-cell").textContent = data.best_fitness.toFixed(2);
            row.querySelector(".time-cell").textContent = data.time_ms.toFixed(1) + " ms";
            row.querySelector(".iter-cell").textContent = data.iterations;
            row.querySelector(".sol-cell").textContent = `[${data.solution.join(", ")}]`;
        }
    });
}
const relaySound = new Audio(
    "/static/sounds/click.mp3"
);

function playRelaySound() {

    relaySound.currentTime = 0;

    relaySound.play().catch(() => {});
}
// ── HTML5 CANVAS INTERSECTION & ANIMATIONS ────────────────────

function animationLoop() {
    if (!canvas || !ctx) return;
    
    // 1. Bersihkan Canvas
    ctx.clearRect(0, 0, 600, 600);
    
    // 2. Gambar Background Infrastruktur Jalan Raya
    drawIntersectionBackground();
    
    // 3. Gambar indikator lajur jalan bercahaya (Red / Yellow / Green)
    drawLaneIndicators();
    
    // 4. Update Timer Siklus Lampu Lalu Lintas
    updateTrafficLightCycle();
    
    // 5. Gambar Status Sinyal Lampu di Persimpangan
    drawTrafficSignals();
    
    // 6. Update & Spawning Kendaraan
    manageVehiclesLogic();
    
    // Ulangi loop
    requestAnimationFrame(animationLoop);
}

function drawIntersectionBackground() {
    const isLight = document.body.classList.contains("light-mode");
    
    // Halaman/Latar Belakang persimpangan
    ctx.fillStyle = isLight ? "#cbd5e1" : "#111827"; // Abu-abu terang vs Gelap
    ctx.fillRect(0, 0, 600, 600);
    
    // Jalan Vertikal & Horizontal
    ctx.fillStyle = isLight ? "#475569" : "#1f2937"; // Asphalt color
    ctx.fillRect(240, 0, 120, 600); // Vertikal
    ctx.fillRect(0, 240, 600, 120); // Horizontal
    
    // Garis Tengah Jalan Dividers (Dashed)
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    
    // Vertikal Center Lines
    ctx.beginPath();
    ctx.moveTo(300, 0); ctx.lineTo(300, 240);
    ctx.moveTo(300, 360); ctx.lineTo(300, 600);
    // Horizontal Center Lines
    ctx.moveTo(0, 300); ctx.lineTo(240, 300);
    ctx.moveTo(360, 300); ctx.lineTo(600, 300);
    ctx.stroke();
    
    // Garis Pinggir Jalan (Solid White)
    ctx.strokeStyle = isLight ? "#94a3b8" : "#374151";
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.beginPath();
    // Pojok kiri atas
    ctx.moveTo(240, 0); ctx.lineTo(240, 240); ctx.lineTo(0, 240);
    // Pojok kanan atas
    ctx.moveTo(360, 0); ctx.lineTo(360, 240); ctx.lineTo(600, 240);
    // Pojok kiri bawah
    ctx.moveTo(240, 600); ctx.lineTo(240, 360); ctx.lineTo(0, 360);
    // Pojok kanan bawah
    ctx.moveTo(360, 600); ctx.lineTo(360, 360); ctx.lineTo(600, 360);
    ctx.stroke();
    
    // Garis Stop Line Zebra Crossings (Solid White Tebal)
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(240, 220); ctx.lineTo(300, 220); // Utara
    ctx.moveTo(300, 380); ctx.lineTo(360, 380); // Selatan
    ctx.moveTo(380, 240); ctx.lineTo(380, 300); // Timur
    ctx.moveTo(220, 300); ctx.lineTo(220, 360); // Barat
    ctx.stroke();
    
    // Area Zebra Crossing Hiasan
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    // North
    ctx.moveTo(240, 230); ctx.lineTo(360, 230);
    // South
    ctx.moveTo(240, 370); ctx.lineTo(360, 370);
    // East
    ctx.moveTo(370, 240); ctx.lineTo(370, 360);
    // West
    ctx.moveTo(230, 240); ctx.lineTo(230, 360);
    ctx.stroke();
    ctx.setLineDash([]); // Reset
}

function updateTrafficLightCycle() {
    // Delta realtime
    const dt = (1 / 60) * simSpeed;
    phaseTimer = Math.max(0, phaseTimer - dt);

    // ===================================
    // PHASE SYSTEM 4-STATE
    // 0 = NS GREEN
    // 1 = NS YELLOW
    // 2 = EW GREEN
    // 3 = EW YELLOW
    // ===================================

    if (phaseTimer <= 0) {
        if (currentPhase === 0) { // NS GREEN -> NS YELLOW
            currentPhase = 1;
            phaseState = "amber";
            phaseTimer = 3.0; // Transisi Kuning 3 Detik
            playRelaySound();
        }
        else if (currentPhase === 1) { // NS YELLOW -> EW GREEN
            currentPhase = 2;
            phaseState = "green";
            phaseTimer = Math.max(currentSolution[2], currentSolution[3]); // Durasi Hijau Timur-Barat
            playRelaySound();
        }
        else if (currentPhase === 2) { // EW GREEN -> EW YELLOW
            currentPhase = 3;
            phaseState = "amber";
            phaseTimer = 3.0; // Transisi Kuning 3 Detik
            playRelaySound();
        }
        else if (currentPhase === 3) { // EW YELLOW -> NS GREEN
            currentPhase = 0;
            phaseState = "green";
            phaseTimer = Math.max(currentSolution[0], currentSolution[1]); // Durasi Hijau Utara-Selatan
            playRelaySound();
        }
    }

    // ===================================
    // LABEL UI & WARNA
    // ===================================
    const phaseLabel = document.getElementById("simActivePhase");
    let phaseName = (currentPhase === 0 || currentPhase === 1) ? "Utara-Selatan" : "Timur-Barat";
    let stateIndo = (currentPhase === 0 || currentPhase === 2) ? "Hijau" : "Kuning";
    
    phaseLabel.textContent = `${phaseName} (${stateIndo})`;
    phaseLabel.style.color = (currentPhase === 0 || currentPhase === 2) ? "#00ff66" : "#ffcc00";

    // ===================================
    // COUNTDOWN
    // ===================================
    const timerLabel = document.getElementById("simCountdown");
    if (timerLabel) {
        timerLabel.textContent = `${Math.ceil(phaseTimer)}s`;
    }
}
function drawTrafficSignals() {
    // Posisi lampu lalu lintas di 4 pojok
    const positions = {
        0: { x: 210, y: 210, angle: 0 },       // Utara
        1: { x: 390, y: 390, angle: Math.PI }, // Selatan
        2: { x: 390, y: 210, angle: Math.PI / 2 }, // Timur
        3: { x: 210, y: 390, angle: -Math.PI / 2 }  // Barat
    };
    
    const uiLights = {
        0: document.getElementById("lightNorth"),
        1: document.getElementById("lightSouth"),
        2: document.getElementById("lightEast"),
        3: document.getElementById("lightWest")
    };
    
    for (let i = 0; i < 4; i++) {
        const pos = positions[i];
        
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(pos.angle);
        
        // Gambar housing box lampu
        ctx.fillStyle = "#1e293b";
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-8, -20, 16, 40, 4);
        ctx.fill();
        ctx.stroke();
        
        // Tentukan warna lampu aktif berdasarkan 4-fase
        let activeColor = "red";
        if (i === 0 || i === 1) { // Arah Utara & Selatan
            if (currentPhase === 0) activeColor = "green";
            else if (currentPhase === 1) activeColor = "amber";
        } else { // Arah Timur & Barat
            if (currentPhase === 2) activeColor = "green";
            else if (currentPhase === 3) activeColor = "amber";
        }
        
        // Gambar 3 lensa lampu (Red, Amber, Green)
        drawSignalLens(-12, activeColor === "red" ? "#ef4444" : "#3f3f46", activeColor === "red");
        drawSignalLens(0, activeColor === "amber" ? "#f59e0b" : "#3f3f46", activeColor === "amber");
        drawSignalLens(12, activeColor === "green" ? "#10b981" : "#3f3f46", activeColor === "green");
        
        ctx.restore();
        
        // Sinkronisasi status LED bundar di dashboard status bawah
        const uiLight = uiLights[i];
        if (uiLight) {
            uiLight.className = "dur-light-status " + activeColor;
        }
    }
}

function drawSignalLens(yOffset, color, isActive) {
    ctx.fillStyle = color;
    if (isActive) {
        // Efek pendaran cahaya (glow) kuat pada lensa lampu aktif
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        // Buat lensa lampu menyala tampak lebih besar
        ctx.beginPath();
        ctx.arc(0, yOffset, 6, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Lensa mati tampak redup dan lebih kecil
        ctx.beginPath();
        ctx.arc(0, yOffset, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.shadowBlur = 0; // Reset
}

function drawLaneIndicators() {
    // Definisi koordinat garis henti dan posisi panah penunjuk lajur
    const indicators = [
        { dir: 0, x1: 240, y1: 220, x2: 300, y2: 220, arrowX: 270, arrowY: 195, dx: 0, dy: 18 }, // Utara (Ke Selatan)
        { dir: 1, x1: 300, y1: 380, x2: 360, y2: 380, arrowX: 330, arrowY: 405, dx: 0, dy: -18 }, // Selatan (Ke Utara)
        { dir: 2, x1: 380, y1: 240, x2: 380, y2: 300, arrowX: 405, arrowY: 270, dx: -18, dy: 0 }, // Timur (Ke Barat)
        { dir: 3, x1: 220, y1: 300, x2: 220, y2: 360, arrowX: 195, arrowY: 330, dx: 18, dy: 0 }  // Barat (Ke Timur)
    ];
    
    indicators.forEach(ind => {
        let lightState = "red";
        if (ind.dir === 0 || ind.dir === 1) {
            if (currentPhase === 0) lightState = "green";
            else if (currentPhase === 1) lightState = "amber";
        } else {
            if (currentPhase === 2) lightState = "green";
            else if (currentPhase === 3) lightState = "amber";
        }
        
        ctx.save();
        ctx.lineWidth = 4;
        
        if (lightState === "red") {
            // Neon Merah membara di aspal
            ctx.strokeStyle = "#ff3b30";
            ctx.shadowColor = "#ff3b30";
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(ind.x1, ind.y1);
            ctx.lineTo(ind.x2, ind.y2);
            ctx.stroke();
        } else if (lightState === "amber") {
            // Neon Kuning/Amber menyala terang sebagai sinyal hati-hati
            ctx.strokeStyle = "#ffcc00";
            ctx.shadowColor = "#ffcc00";
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(ind.x1, ind.y1);
            ctx.lineTo(ind.x2, ind.y2);
            ctx.stroke();
        } else if (lightState === "green") {
            // Neon Hijau cerah membentuk panah petunjuk arah di aspal
            ctx.strokeStyle = "#00ff66";
            ctx.shadowColor = "#00ff66";
            ctx.shadowBlur = 10;
            
            // Batang Panah
            ctx.beginPath();
            ctx.moveTo(ind.arrowX, ind.arrowY);
            ctx.lineTo(ind.arrowX + ind.dx, ind.arrowY + ind.dy);
            ctx.stroke();
            
            // Kepala Panah
            ctx.fillStyle = "#00ff66";
            ctx.beginPath();
            if (ind.dir === 0) { // Ke Bawah
                ctx.moveTo(ind.arrowX - 6, ind.arrowY + 12);
                ctx.lineTo(ind.arrowX + 6, ind.arrowY + 12);
                ctx.lineTo(ind.arrowX, ind.arrowY + 18);
            } else if (ind.dir === 1) { // Ke Atas
                ctx.moveTo(ind.arrowX - 6, ind.arrowY - 12);
                ctx.lineTo(ind.arrowX + 6, ind.arrowY - 12);
                ctx.lineTo(ind.arrowX, ind.arrowY - 18);
            } else if (ind.dir === 2) { // Ke Kiri
                ctx.moveTo(ind.arrowX - 12, ind.arrowY - 6);
                ctx.lineTo(ind.arrowX - 12, ind.arrowY + 6);
                ctx.lineTo(ind.arrowX - 18, ind.arrowY);
            } else if (ind.dir === 3) { // Ke Kanan
                ctx.moveTo(ind.arrowX + 12, ind.arrowY - 6);
                ctx.lineTo(ind.arrowX + 12, ind.arrowY + 6);
                ctx.lineTo(ind.arrowX + 18, ind.arrowY);
            }
            ctx.fill();
        }
        ctx.restore();
    });
}

function manageVehiclesLogic() {
    // 1. Spawning Kendaraan baru
    const sliderIds = { 0: "vehNorth", 1: "vehSouth", 2: "vehEast", 3: "vehWest" };
    
    for (let d = 0; d < 4; d++) {
        const volume = parseInt(document.getElementById(sliderIds[d]).value);
        
        // Hitung interval spawning (dipercepat agar antrean mengular ke belakang terlihat memuaskan)
        const spawnInterval = Math.max(12, 240 - volume * 1.4);
        
        spawnTimers[d] += simSpeed;
        if (spawnTimers[d] >= spawnInterval) {
            spawnTimers[d] = 0;
            // Spawn jika aman
            const canSpawn = vehicles.filter(v => v.direction === d && (d === 0 ? v.y < 35 : d === 1 ? v.y > 565 : d === 2 ? v.x > 565 : v.x < 35)).length === 0;
            if (canSpawn) {
                vehicles.push(new Vehicle(d));
            }
        }
    }
    
    // 2. Filter lajur
    let directionGroups = { 0: [], 1: [], 2: [], 3: [] };
    vehicles.forEach(v => directionGroups[v.direction].push(v));
    
    // Counter antrean tiap arah untuk live telemetri
    let queueNorth = 0, queueSouth = 0, queueEast = 0, queueWest = 0;
    let waitingCount = 0;
    
    // 3. Update & Gambar setiap kendaraan
    vehicles = vehicles.filter(v => {
        // Tentukan kondisi sinyal lampu untuk lajur mobil ini (2-Phase)
        let lightState = "red";
        if (v.direction === 0 || v.direction === 1) {
            if (currentPhase === 0) lightState = "green";
            else if (currentPhase === 1) lightState = "amber";
        } else {
            if (currentPhase === 2) lightState = "green";
            else if (currentPhase === 3) lightState = "amber";
        }
        
        v.update(lightState, directionGroups[v.direction]);
        v.draw();
        
        if (v.isStopped) {
            waitingCount++;
            if (v.direction === 0) queueNorth++;
            else if (v.direction === 1) queueSouth++;
            else if (v.direction === 2) queueEast++;
            else if (v.direction === 3) queueWest++;
        }
        
        return !v.isOutOfBound();
    });
    
    // Update data antrean realtime ke kartu dashboard status bawah
    document.getElementById("queueNorth").textContent = `Antrean: ${queueNorth}`;
    document.getElementById("queueSouth").textContent = `Antrean: ${queueSouth}`;
    document.getElementById("queueEast").textContent = `Antrean: ${queueEast}`;
    document.getElementById("queueWest").textContent = `Antrean: ${queueWest}`;
    
    // Update counter total antrean di overlay canvas
    document.getElementById("simTotalQueue").textContent = `${waitingCount} Mobil`;
    
    // 4. Hitung & Update LIVE FITNESS secara realtime
    // Live Fitness mengadopsi formula backend berbasis data antrean aktif
    let total_green = Math.max(currentSolution[0], currentSolution[1]) + Math.max(currentSolution[2], currentSolution[3]) + 6;
    let liveFitness = 0;
    const queues = [queueNorth, queueSouth, queueEast, queueWest];
    
    for (let i = 0; i < 4; i++) {
        let q = queues[i];
        let g = currentSolution[i];
        let red_time = Math.max(0, total_green - g);
        let wait_ratio = red_time / Math.max(1.0, total_green);
        
        // Pinalti jika antrean melebihi kapasitas pengosongan normal (g * 0.5)
        let capacity = g * 0.5;
        let overflow = Math.max(0.0, q * 2.5 - capacity); // Pengali beban 2.5
        
        liveFitness += q * 5.0 * wait_ratio + overflow * 10.0;
    }
    
    // Tampilkan live fitness
    document.getElementById("simLiveFitness").textContent = liveFitness.toFixed(2);
    
    // Heatmap Kemacetan (Glow merah pada persimpangan saat macet)
    const canvasWrapper = document.querySelector('.canvas-wrapper');
    if (canvasWrapper) {
        if (liveFitness > 100) {
            let intensity = Math.min(0.8, (liveFitness - 100) / 400);
            let blur = Math.min(120, 20 + liveFitness / 4);
            canvasWrapper.style.boxShadow = `inset 0 0 ${blur}px rgba(239, 68, 68, ${intensity})`;
        } else {
            canvasWrapper.style.boxShadow = `inset 0 0 20px rgba(0,0,0,0.6)`;
        }
    }
}
