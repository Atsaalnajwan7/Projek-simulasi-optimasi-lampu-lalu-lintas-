# app.py
"""
Flask Web Application Entry Point - Simulasi Optimasi Lampu Lalu Lintas.
Menyediakan REST API untuk menjalankan algoritma optimasi dan mengembalikan data analisis lengkap.
"""

from flask import Flask, render_template, request, jsonify
import time
import os
import pandas as pd
import numpy as np

# Import algoritma optimasi
from algorithms.hill_climbing import simple_hc, steepest_hc, stochastic_hc
from algorithms.simulated_annealing import simulated_annealing
from algorithms.genetic_algorithm import genetic_algorithm

app = Flask(__name__)

# Konfigurasi konstanta traffic
CAPACITY_FACTOR = 0.5   # kapasitas = green_time * faktor ini
PENALTY_FACTOR = 10.0   # pinalti antrean yang tidak tertampung

# Global lookup table untuk data historis
LOOKUP_TABLE = None

def load_traffic_data():
    """Membaca traffic.csv dan mengelompokkan kendaraan per jam per persimpangan."""
    global LOOKUP_TABLE
    csv_path = "traffic.csv"
    
    if not os.path.exists(csv_path):
        print(f"WARNING: File {csv_path} tidak ditemukan. Menggunakan dummy data.")
        # Buat lookup dummy jika file tidak ada
        idx = pd.MultiIndex.from_product([[1, 2, 3, 4], range(24)], names=["Junction", "hour"])
        LOOKUP_TABLE = pd.Series(np.random.randint(10, 60, size=len(idx)), index=idx)
        return
        
    try:
        print("Memuat data traffic.csv...")
        df = pd.read_csv(csv_path, parse_dates=["DateTime"])
        df["hour"] = df["DateTime"].dt.hour
        # Menghitung rata-rata kendaraan per junction (1-4) per jam (0-23)
        LOOKUP_TABLE = df.groupby(["Junction", "hour"])["Vehicles"].mean()
        print("Data traffic.csv berhasil dimuat!")
    except Exception as e:
        print(f"Error memuat traffic.csv: {e}")
        idx = pd.MultiIndex.from_product([[1, 2, 3, 4], range(24)], names=["Junction", "hour"])
        LOOKUP_TABLE = pd.Series(np.random.randint(10, 60, size=len(idx)), index=idx)

# Load data traffic saat server dinyalakan
load_traffic_data()

# ── FUNGSI FITNESS ─────────────────────────────────────────────

def get_fitness_function(mode="interactive", vehicles=None, hour=None):
    """
    Membuat fungsi fitness (minimisasi delay/antrean) berdasarkan mode yang dipilih.
    Nilai fitness yang lebih kecil merepresentasikan kemacetan yang lebih rendah.
    """
    
    if mode == "historical" and LOOKUP_TABLE is not None:
        # Optimasi berbasis data historis traffic.csv
        def fitness_historical(green_time: list) -> float:
            total_queue = 0.0
            # green_time mewakili [Utara, Selatan, Timur, Barat] -> Indeks 0, 1, 2, 3
            # Junction 1=Utara, 2=Selatan, 3=Timur, 4=Barat
            
            hours_to_evaluate = range(24) if hour is None or hour == -1 else [hour]
            
            for h in hours_to_evaluate:
                for j in range(1, 5):
                    demand = LOOKUP_TABLE.get((j, h), 20)
                    capacity = green_time[j - 1] * CAPACITY_FACTOR
                    # Kendaraan yang tersisa/mengantre karena demand melebihi kapasitas alokasi waktu hijau
                    total_queue += max(0.0, demand - capacity)
                    
            return total_queue
            
        return fitness_historical
        
    else:
        # Optimasi berbasis input kendaraan realtime dari user di UI
        # vehicles = [v_utara, v_selatan, v_timur, v_barat]
        if vehicles is None or len(vehicles) < 4:
            vehicles = [30.0, 30.0, 30.0, 30.0]
            
        def fitness_interactive(green_time: list) -> float:
            total_waiting_time = 0.0
            total_green = sum(green_time)
            
            for i in range(4):
                v = vehicles[i]
                g = green_time[i]
                
                # Formula waktu tunggu kendaraan di simpang 4-arah:
                # 1. Rata-rata kendaraan tertahan saat lampu merah (siklus sisa)
                #    Semakin besar green time arah lain (total_green - g), semakin lama menunggu.
                red_time = max(0.0, total_green - g)
                wait_ratio = red_time / max(1.0, total_green)
                
                # 2. Pinalti jika alokasi lampu hijau tidak menampung volume kendaraan
                capacity = g * CAPACITY_FACTOR
                overflow = max(0.0, v - capacity)
                
                # Total delay = kendaraan terhambat lampu merah + pinalti macet total
                total_waiting_time += v * wait_ratio + overflow * PENALTY_FACTOR
                
            return total_waiting_time
            
        return fitness_interactive

# ── ROUTE VIEW ─────────────────────────────────────────────────

@app.route("/")
def index():
    """Halaman Utama Dashboard Simulasi."""
    return render_template("index.html")

# ── ROUTE API OPTIMIZATION ─────────────────────────────────────

@app.route("/api/optimize", methods=["POST"])
def optimize():
    """API untuk menjalankan satu algoritma spesifik dengan param khusus."""
    data = request.json or {}
    
    # Ambil Parameter Mode & Studi Kasus
    mode = data.get("mode", "interactive") # interactive | historical
    vehicles = data.get("vehicles", [30, 20, 25, 35]) # [Utara, Selatan, Timur, Barat]
    hour = data.get("hour", -1) # -1 berarti all-day, 0-23 jam spesifik
    
    # Ambil Algoritma & Param
    algo = data.get("algorithm", "hill_climbing")
    variant = data.get("variant", "simple") # Untuk HC: simple | steepest | stochastic
    
    # Buat fitness function
    fit_fn = get_fitness_function(mode, vehicles, hour)
    
    start_time = time.time()
    
    # Eksekusi algoritma terpilih
    if algo == "hill_climbing":
        n_iter = int(data.get("n_iter", 500))
        step = float(data.get("step", 5.0))
        
        if variant == "steepest":
            n_neighbors = int(data.get("n_neighbors", 20))
            sol, hist, sol_hist = steepest_hc(fit_fn, n_iter, n_neighbors, step)
            algo_name = "Hill Climbing (Steepest-Ascent)"
        elif variant == "stochastic":
            T_start = float(data.get("T_start", 50.0))
            sol, hist, sol_hist = stochastic_hc(fit_fn, n_iter, T_start, step)
            algo_name = "Hill Climbing (Stochastic)"
        else:
            sol, hist, sol_hist = simple_hc(fit_fn, n_iter, step)
            algo_name = "Hill Climbing (Simple)"
            
        result = {
            "algorithm": algo_name,
            "solution": [round(v, 2) for v in sol],
            "best_fitness": round(min(hist), 4),
            "history": hist,
            "solution_history": [[round(val, 2) for val in s] for s in sol_hist],
        }
        
    elif algo == "simulated_annealing":
        T0 = float(data.get("T0", 1000.0))
        cooling = float(data.get("cooling", 0.95))
        T_min = float(data.get("T_min", 0.01))
        step = float(data.get("step", 10.0))
        
        sol, hist, temp_hist, accept_hist, worse_accepted = simulated_annealing(fit_fn, T0, cooling, T_min, step)
        
        result = {
            "algorithm": "Simulated Annealing",
            "solution": [round(v, 2) for v in sol],
            "best_fitness": round(min(hist), 4),
            "history": hist,
            "temp_history": temp_hist,
            "accept_history": accept_hist,
            "worse_accepted": worse_accepted
        }
        
    elif algo == "genetic_algorithm":
        pop_size = int(data.get("pop_size", 50))
        generations = int(data.get("generations", 200))
        cx_prob = float(data.get("cx_prob", 0.8))
        mut_prob = float(data.get("mut_prob", 0.1))
        elite_size = int(data.get("elite_size", 2))
        selection_method = data.get("selection_method", "tournament")
        tournament_k = int(data.get("tournament_k", 3))
        
        sol, best_hist, avg_hist = genetic_algorithm(fit_fn, pop_size, generations, cx_prob, mut_prob, elite_size, selection_method, tournament_k)
        
        result = {
            "algorithm": "Genetic Algorithm",
            "solution": [round(v, 2) for v in sol],
            "best_fitness": round(min(best_hist), 4),
            "history": best_hist, # Digunakan untuk grafik konvergensi umum
            "best_history": best_hist,
            "avg_history": avg_hist
        }
    else:
        return jsonify({"error": "Algoritma tidak valid."}), 400
        
    elapsed_ms = round((time.time() - start_time) * 1000, 2)
    result["time_ms"] = elapsed_ms
    
    return jsonify(result)

# ── ROUTE API COMPARE (RUN ALL) ────────────────────────────────

@app.route("/api/compare", methods=["POST"])
def compare():
    """API Pembanding: menjalankan kelima variasi algoritma pada kondisi/input yang sama."""
    data = request.json or {}
    
    # Ambil Parameter Mode & Studi Kasus
    mode = data.get("mode", "interactive")
    vehicles = data.get("vehicles", [30, 20, 25, 35])
    hour = data.get("hour", -1)
    
    fit_fn = get_fitness_function(mode, vehicles, hour)
    
    # Parameter Default HC
    hc_n_iter = int(data.get("hc_n_iter", 500))
    hc_step = float(data.get("hc_step", 5.0))
    
    # Parameter Default SA
    sa_T0 = float(data.get("sa_T0", 1000.0))
    sa_cooling = float(data.get("sa_cooling", 0.95))
    sa_T_min = float(data.get("sa_T_min", 0.01))
    sa_step = float(data.get("sa_step", 10.0))
    
    # Parameter Default GA
    ga_pop_size = int(data.get("ga_pop_size", 50))
    ga_generations = int(data.get("ga_generations", 200))
    ga_cx_prob = float(data.get("ga_cx_prob", 0.8))
    ga_mut_prob = float(data.get("ga_mut_prob", 0.1))
    ga_elite_size = int(data.get("ga_elite_size", 2))
    ga_selection = data.get("ga_selection", "tournament")
    
    comparison_results = {}
    
    # 1. Simple HC
    start = time.time()
    sol, hist, sol_hist = simple_hc(fit_fn, hc_n_iter, hc_step)
    comparison_results["simple_hc"] = {
        "name": "Simple Hill Climbing",
        "solution": [round(v, 2) for v in sol],
        "best_fitness": round(min(hist), 4),
        "history": hist,
        "iterations": len(hist) - 1,
        "time_ms": round((time.time() - start) * 1000, 2)
    }
    
    # 2. Steepest HC
    start = time.time()
    n_neighbors = int(data.get("hc_n_neighbors", 20))
    sol, hist, sol_hist = steepest_hc(fit_fn, hc_n_iter, n_neighbors, hc_step)
    comparison_results["steepest_hc"] = {
        "name": "Steepest-Ascent Hill Climbing",
        "solution": [round(v, 2) for v in sol],
        "best_fitness": round(min(hist), 4),
        "history": hist,
        "iterations": len(hist) - 1,
        "time_ms": round((time.time() - start) * 1000, 2)
    }
    
    # 3. Stochastic HC
    start = time.time()
    T_start = float(data.get("hc_T_start", 50.0))
    sol, hist, sol_hist = stochastic_hc(fit_fn, hc_n_iter, T_start, hc_step)
    comparison_results["stochastic_hc"] = {
        "name": "Stochastic Hill Climbing",
        "solution": [round(v, 2) for v in sol],
        "best_fitness": round(min(hist), 4),
        "history": hist,
        "iterations": len(hist) - 1,
        "time_ms": round((time.time() - start) * 1000, 2)
    }
    
    # 4. Simulated Annealing
    start = time.time()
    sol, hist, temp_hist, accept_hist, worse_accepted = simulated_annealing(fit_fn, sa_T0, sa_cooling, sa_T_min, sa_step)
    comparison_results["simulated_annealing"] = {
        "name": "Simulated Annealing",
        "solution": [round(v, 2) for v in sol],
        "best_fitness": round(min(hist), 4),
        "history": hist,
        "temp_history": temp_hist,
        "accept_history": accept_hist,
        "worse_accepted": worse_accepted,
        "iterations": len(hist) - 1,
        "time_ms": round((time.time() - start) * 1000, 2)
    }
    
    # 5. Genetic Algorithm
    start = time.time()
    sol, best_hist, avg_hist = genetic_algorithm(fit_fn, ga_pop_size, ga_generations, ga_cx_prob, ga_mut_prob, ga_elite_size, ga_selection)
    comparison_results["genetic_algorithm"] = {
        "name": "Genetic Algorithm",
        "solution": [round(v, 2) for v in sol],
        "best_fitness": round(min(best_hist), 4),
        "history": best_hist,
        "best_history": best_hist,
        "avg_history": avg_hist,
        "iterations": len(best_hist) - 1,
        "time_ms": round((time.time() - start) * 1000, 2)
    }
    
    # Tentukan Algoritma Terbaik Secara Otomatis (Fitness terkecil)
    best_key = min(comparison_results, key=lambda k: comparison_results[k]["best_fitness"])
    best_algo = comparison_results[best_key]["name"]
    
    return jsonify({
        "results": comparison_results,
        "best_algorithm": best_algo,
        "best_key": best_key
    })

if __name__ == "__main__":
    # Jalankan server lokal di port 5000
    app.run(debug=True, host="0.0.0.0", port=5000)
