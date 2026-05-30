# algorithms/simulated_annealing.py
"""
Implementasi Algoritma Simulated Annealing untuk Optimasi Durasi Lampu Lalu Lintas.
Menyertakan cooling schedule dan visualisasi penerimaan solusi buruk.
"""

import random
import math
from algorithms.hill_climbing import MIN_GREEN, MAX_GREEN

def simulated_annealing(fitness_fn,
                        T0: float      = 1000.0,
                        cooling: float = 0.95,
                        T_min: float   = 0.01,
                        step: float    = 10.0) -> tuple:
    """
    Simulated Annealing: Menerima solusi yang lebih buruk berdasarkan probabilitas Boltzmann:
    P = exp(-delta / T) untuk lolos dari jebakan local optima.
    
    Args:
        fitness_fn : fungsi objektif (minimisasi)
        T0         : suhu awal
        cooling    : laju pendinginan (0 < cooling < 1)
        T_min      : suhu minimum (kondisi berhenti)
        step       : rentang perubahan acak tetangga
        
    Returns:
        (best_solution, fitness_history, temp_history, accept_history, worse_accepted)
        - worse_accepted: list berisi dict {iteration, fitness, temp, accepted} untuk memetakan
                          keputusan Boltzmann terhadap solusi buruk.
    """
    current = [random.uniform(MIN_GREEN, MAX_GREEN) for _ in range(4)]
    current_fit = fitness_fn(current)
    
    best = current[:]
    best_fit = current_fit
    
    T = T0
    iteration = 0
    
    fitness_history = [current_fit]
    temp_history = [T]
    accept_history = [1.0] # Solusi pertama selalu diterima
    worse_accepted = [] # Untuk visualisasi penerimaan solusi buruk
    
    while T > T_min:
        iteration += 1
        
        # Buat tetangga secara acak
        neighbor = current[:]
        idx = random.randint(0, 3)
        neighbor[idx] = max(MIN_GREEN, min(MAX_GREEN, neighbor[idx] + random.uniform(-step, step)))
        
        neighbor_fit = fitness_fn(neighbor)
        delta = neighbor_fit - current_fit
        
        # Hitung probabilitas penerimaan Boltzmann
        if delta < 0:
            p_accept = 1.0
            accepted = True
        else:
            p_accept = math.exp(-delta / T)
            accepted = random.random() < p_accept
            
            # Catat upaya evaluasi solusi buruk
            worse_accepted.append({
                "iteration": iteration,
                "delta": round(delta, 4),
                "fitness": round(neighbor_fit, 4),
                "temp": round(T, 4),
                "p_accept": round(p_accept, 4),
                "accepted": accepted
            })
            
        if accepted:
            current = neighbor
            current_fit = neighbor_fit
            
        # Simpan solusi terbaik yang pernah ditemukan
        if current_fit < best_fit:
            best = current[:]
            best_fit = current_fit
            
        # Rekam history untuk chart
        fitness_history.append(round(best_fit, 4))
        temp_history.append(round(T, 4))
        accept_history.append(round(p_accept, 4))
        
        # Dinginkan suhu (Cooling Schedule)
        T *= cooling
        
    return best, fitness_history, temp_history, accept_history, worse_accepted
