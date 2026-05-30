# backend/algorithms/simulated_annealing.py
# Bertugas: implementasi Simulated Annealing dengan cooling schedule

import random
import math
from utils.fitness import MIN_GREEN, MAX_GREEN

def simulated_annealing(fitness_fn,
                        T0: float      = 1000.0,
                        cooling: float = 0.95,
                        T_min: float   = 0.01) -> tuple:
    """
    Simulated Annealing: menerima solusi lebih buruk berdasarkan
    probabilitas Boltzmann P = exp(-delta / T) untuk lolos local optima.

    Args:
        fitness_fn : fungsi objektif
        T0         : suhu awal (semakin besar = eksplorasi lebih luas)
        cooling    : laju pendinginan 0 < cooling < 1
        T_min      : suhu minimum (kondisi berhenti)
    Returns:
        (best_solution, fitness_history, temp_history, accept_history)
        - fitness_history : nilai terbaik per iterasi
        - temp_history    : nilai suhu per iterasi (untuk kurva cooling)
        - accept_history  : probabilitas penerimaan per iterasi
    """
    current  = [random.uniform(MIN_GREEN, MAX_GREEN) for _ in range(4)]
    best     = current[:]
    T        = T0

    fitness_history = []
    temp_history    = []
    accept_history  = []

    while T > T_min:
        # Buat tetangga dengan perubahan acak lebih besar di suhu tinggi
        neighbor = current[:]
        idx = random.randint(0, 3)
        neighbor[idx] = max(MIN_GREEN, min(MAX_GREEN,
                            neighbor[idx] + random.uniform(-10, 10)))

        delta = fitness_fn(neighbor) - fitness_fn(current)

        # Hitung probabilitas penerimaan Boltzmann
        if delta < 0:
            p_accept = 1.0      # selalu terima kalau lebih baik
        else:
            p_accept = math.exp(-delta / T)

        if random.random() < p_accept:
            current = neighbor

        # Simpan solusi terbaik sepanjang waktu
        if fitness_fn(current) < fitness_fn(best):
            best = current[:]

        # Rekam history untuk visualisasi
        fitness_history.append(round(fitness_fn(best), 4))
        temp_history.append(round(T, 4))
        accept_history.append(round(p_accept, 4))

        # Dinginkan suhu
        T *= cooling

    return best, fitness_history, temp_history, accept_history