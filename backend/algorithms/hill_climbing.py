# backend/algorithms/hill_climbing.py
# Bertugas: implementasi Simple, Steepest-Ascent, Stochastic HC

import random
import math
from utils.fitness import MIN_GREEN, MAX_GREEN

def _random_solution() -> list:
    """Buat solusi awal acak: 4 nilai green_time."""
    return [random.uniform(MIN_GREEN, MAX_GREEN) for _ in range(4)]

def _clamp(value: float) -> float:
    """Pastikan nilai dalam rentang [MIN_GREEN, MAX_GREEN]."""
    return max(MIN_GREEN, min(MAX_GREEN, value))

def _tweak(solution: list, step: float = 5.0) -> list:
    """Ubah satu parameter acak sejumlah ±step."""
    neighbor = solution[:]
    idx = random.randint(0, 3)
    neighbor[idx] = _clamp(neighbor[idx] + random.uniform(-step, step))
    return neighbor


def simple_hc(fitness_fn, n_iter: int = 500) -> tuple:
    """
    Simple Hill Climbing: geser satu parameter per iterasi,
    terima kalau lebih baik.

    Args:
        fitness_fn : fungsi lambda yang menerima green_time list
        n_iter     : jumlah iterasi
    Returns:
        (best_solution, fitness_history)
    """
    current = _random_solution()
    history = [fitness_fn(current)]

    for _ in range(n_iter):
        neighbor = _tweak(current)
        if fitness_fn(neighbor) < fitness_fn(current):
            current = neighbor
        history.append(fitness_fn(current))

    return current, history


def steepest_hc(fitness_fn, n_iter: int = 500,
                n_neighbors: int = 20) -> tuple:
    """
    Steepest-Ascent HC: evaluasi semua tetangga, pilih yang terbaik.

    Args:
        fitness_fn   : fungsi objektif
        n_iter       : jumlah iterasi
        n_neighbors  : jumlah tetangga yang dievaluasi per iterasi
    Returns:
        (best_solution, fitness_history)
    """
    current = _random_solution()
    history = [fitness_fn(current)]

    for _ in range(n_iter):
        best_neighbor = current[:]
        best_fitness  = fitness_fn(current)
        for _ in range(n_neighbors):
            nb = _tweak(current)
            nb_fitness = fitness_fn(nb)
            if nb_fitness < best_fitness:
                best_neighbor = nb
                best_fitness  = nb_fitness
        current = best_neighbor
        history.append(best_fitness)

    return current, history


def stochastic_hc(fitness_fn, n_iter: int = 500,
                  T_start: float = 50.0) -> tuple:
    """
    Stochastic HC: terima solusi lebih buruk dengan probabilitas
    yang menurun seiring iterasi (membantu keluar local optima).

    Args:
        fitness_fn : fungsi objektif
        n_iter     : jumlah iterasi
        T_start    : suhu awal untuk probabilitas penerimaan
    Returns:
        (best_solution, fitness_history)
    """
    current = _random_solution()
    history = [fitness_fn(current)]

    for i in range(n_iter):
        neighbor = _tweak(current)
        delta = fitness_fn(neighbor) - fitness_fn(current)
        # Suhu menurun seiring iterasi
        temperature = T_start * (1 - i / n_iter)
        # Terima kalau lebih baik, atau dengan probabilitas Boltzmann
        if delta < 0 or random.random() < math.exp(-delta / max(temperature, 0.01)):
            current = neighbor
        history.append(fitness_fn(current))

    return current, history