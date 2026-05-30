# algorithms/hill_climbing.py
"""
Implementasi Algoritma Hill Climbing untuk Optimasi Durasi Lampu Lalu Lintas.
Mencakup:
1. Simple Hill Climbing
2. Steepest-Ascent Hill Climbing
3. Stochastic Hill Climbing
"""

import random
import math

MIN_GREEN = 15
MAX_GREEN = 30

def _random_solution(min_val=MIN_GREEN, max_val=MAX_GREEN) -> list:
    """Membuat solusi awal acak: 4 nilai durasi lampu hijau [Utara, Selatan, Timur, Barat]."""
    return [random.uniform(min_val, max_val) for _ in range(4)]

def _clamp(value: float, min_val=MIN_GREEN, max_val=MAX_GREEN) -> float:
    """Memastikan nilai durasi tetap berada dalam rentang aman [MIN_GREEN, MAX_GREEN]."""
    return max(min_val, min(max_val, value))

def _tweak(solution: list, step: float = 5.0, min_val=MIN_GREEN, max_val=MAX_GREEN) -> list:
    """Mengubah satu parameter arah secara acak sebesar +/- step."""
    neighbor = solution[:]
    idx = random.randint(0, 3)
    neighbor[idx] = _clamp(neighbor[idx] + random.uniform(-step, step), min_val, max_val)
    return neighbor

def simple_hc(fitness_fn, n_iter: int = 500, step: float = 5.0) -> tuple:
    """
    Simple Hill Climbing: Tweak satu parameter arah acak per iterasi.
    Langsung terima jika solusi tetangga memiliki fitness lebih baik (lebih kecil).
    
    Returns:
        (best_solution, fitness_history, solution_history)
    """
    current = _random_solution()
    current_fit = fitness_fn(current)
    
    fitness_history = [current_fit]
    solution_history = [current[:]]
    
    for _ in range(n_iter):
        neighbor = _tweak(current, step)
        neighbor_fit = fitness_fn(neighbor)
        
        if neighbor_fit < current_fit:
            current = neighbor
            current_fit = neighbor_fit
            
        fitness_history.append(current_fit)
        solution_history.append(current[:])
        
    return current, fitness_history, solution_history

def steepest_hc(fitness_fn, n_iter: int = 500, n_neighbors: int = 20, step: float = 5.0) -> tuple:
    """
    Steepest-Ascent Hill Climbing: Evaluasi sejumlah n_neighbors tetangga sekaligus.
    Pilih tetangga dengan fitness terbaik, lalu lakukan perpindahan jika lebih baik dari saat ini.
    Membantu melihat local optima dengan cepat karena mencari kemiringan tertajam.
    
    Returns:
        (best_solution, fitness_history, solution_history)
    """
    current = _random_solution()
    current_fit = fitness_fn(current)
    
    fitness_history = [current_fit]
    solution_history = [current[:]]
    
    for _ in range(n_iter):
        best_neighbor = current[:]
        best_neighbor_fit = current_fit
        
        for _ in range(n_neighbors):
            nb = _tweak(current, step)
            nb_fit = fitness_fn(nb)
            if nb_fit < best_neighbor_fit:
                best_neighbor = nb
                best_neighbor_fit = nb_fit
                
        current = best_neighbor
        current_fit = best_neighbor_fit
        
        fitness_history.append(current_fit)
        solution_history.append(current[:])
        
    return current, fitness_history, solution_history

def stochastic_hc(fitness_fn, n_iter: int = 500, T_start: float = 50.0, step: float = 5.0) -> tuple:
    """
    Stochastic Hill Climbing: Menggunakan probabilitas Boltzmann yang menurun untuk
    dapat menerima solusi lebih buruk secara acak, membantu keluar dari local optima.
    
    Returns:
        (best_solution, fitness_history, solution_history)
    """
    current = _random_solution()
    current_fit = fitness_fn(current)
    
    fitness_history = [current_fit]
    solution_history = [current[:]]
    
    for i in range(n_iter):
        neighbor = _tweak(current, step)
        neighbor_fit = fitness_fn(neighbor)
        
        delta = neighbor_fit - current_fit
        # Temperatur linear decay
        temperature = T_start * (1.0 - i / n_iter)
        
        # Jika lebih baik, terima. Jika lebih buruk, terima dengan probabilitas Boltzmann.
        if delta < 0:
            current = neighbor
            current_fit = neighbor_fit
        else:
            prob = math.exp(-delta / max(temperature, 0.01))
            if random.random() < prob:
                current = neighbor
                current_fit = neighbor_fit
                
        fitness_history.append(current_fit)
        solution_history.append(current[:])
        
    return current, fitness_history, solution_history
