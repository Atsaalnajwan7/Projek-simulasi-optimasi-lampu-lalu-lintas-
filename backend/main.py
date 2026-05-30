# backend/main.py
# Bertugas: entry point FastAPI — definisi semua endpoint API

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import time

from utils.preprocessor import load_traffic
from utils.fitness import fitness
from algorithms.hill_climbing import simple_hc, steepest_hc, stochastic_hc
from algorithms.simulated_annealing import simulated_annealing
from algorithms.genetic_algorithm import genetic_algorithm

app = FastAPI(title="Traffic Optimization API")

# CORS: izinkan akses dari frontend (domain .my.id + localhost dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://namaproject.my.id",
        "https://namaproject.vercel.app",
        "http://localhost:3000"
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load data sekali saat server start (bukan setiap request)
LOOKUP = load_traffic("data/traffic.csv")
fitness_fn = lambda green_time: fitness(green_time, LOOKUP)


# ── Schema request ─────────────────────────────────────────────
class HCParams(BaseModel):
    variant: str  = "simple"   # simple | steepest | stochastic
    n_iter:  int  = 500

class SAParams(BaseModel):
    T0:      float = 1000.0
    cooling: float = 0.95
    T_min:   float = 0.01

class GAParams(BaseModel):
    pop_size:    int   = 50
    generations: int   = 200
    cx_prob:     float = 0.8
    mut_prob:    float = 0.1


# ── Endpoint Hill Climbing ─────────────────────────────────────
@app.post("/api/run/hc")
def run_hc(params: HCParams):
    start = time.time()
    if params.variant == "steepest":
        sol, hist = steepest_hc(fitness_fn, params.n_iter)
    elif params.variant == "stochastic":
        sol, hist = stochastic_hc(fitness_fn, params.n_iter)
    else:
        sol, hist = simple_hc(fitness_fn, params.n_iter)
    return {
        "algorithm":    f"Hill Climbing ({params.variant})",
        "solution":     [round(v, 2) for v in sol],
        "best_fitness": round(min(hist), 4),
        "history":      hist,
        "time_ms":      round((time.time() - start) * 1000, 2)
    }

# ── Endpoint Simulated Annealing ───────────────────────────────
@app.post("/api/run/sa")
def run_sa(params: SAParams):
    start = time.time()
    sol, hist, temp_hist, accept_hist = simulated_annealing(
        fitness_fn, params.T0, params.cooling, params.T_min)
    return {
        "algorithm":      "Simulated Annealing",
        "solution":       [round(v, 2) for v in sol],
        "best_fitness":   round(min(hist), 4),
        "history":        hist,
        "temp_history":   temp_hist,
        "accept_history": accept_hist,
        "time_ms":        round((time.time() - start) * 1000, 2)
    }

# ── Endpoint Genetic Algorithm ─────────────────────────────────
@app.post("/api/run/ga")
def run_ga(params: GAParams):
    start = time.time()
    sol, best_hist, avg_hist = genetic_algorithm(
        fitness_fn, params.pop_size, params.generations,
        params.cx_prob, params.mut_prob)
    return {
        "algorithm":    "Genetic Algorithm",
        "solution":     [round(v, 2) for v in sol],
        "best_fitness": round(min(best_hist), 4),
        "best_history": best_hist,
        "avg_history":  avg_hist,
        "time_ms":      round((time.time() - start) * 1000, 2)
    }

# ── Endpoint Compare (jalankan ketiganya sekaligus) ────────────
@app.post("/api/run/compare")
def run_compare(hc: HCParams, sa: SAParams, ga: GAParams):
    hc_res = run_hc(hc)
    sa_res = run_sa(sa)
    ga_res = run_ga(ga)
    return {
        "hill_climbing":       hc_res,
        "simulated_annealing": sa_res,
        "genetic_algorithm":   ga_res
    }