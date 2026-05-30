# backend/algorithms/genetic_algorithm.py
# Bertugas: implementasi GA dengan seleksi, crossover, mutasi, elitisme

import random
from utils.fitness import MIN_GREEN, MAX_GREEN

def genetic_algorithm(fitness_fn,
                      pop_size:    int   = 50,
                      generations: int   = 200,
                      cx_prob:     float = 0.8,
                      mut_prob:    float = 0.1,
                      elite:       int   = 2) -> tuple:
    """
    Genetic Algorithm untuk optimasi alokasi sinyal traffic.

    Args:
        fitness_fn  : fungsi objektif (minimisasi)
        pop_size    : ukuran populasi
        generations : jumlah generasi
        cx_prob     : probabilitas crossover (0–1)
        mut_prob    : probabilitas mutasi per gen (0–1)
        elite       : jumlah individu terbaik yang dipertahankan (elitisme)
    Returns:
        (best_solution, best_history, avg_history)
        - best_history : nilai fitness terbaik per generasi
        - avg_history  : rata-rata fitness populasi per generasi
    """

    def init_population() -> list:
        """Buat populasi awal secara acak."""
        return [[random.uniform(MIN_GREEN, MAX_GREEN) for _ in range(4)]
                for _ in range(pop_size)]

    def tournament_select(population: list, k: int = 3) -> list:
        """Pilih individu terbaik dari k kandidat acak (tournament)."""
        candidates = random.sample(population, k)
        return min(candidates, key=fitness_fn)

    def single_point_crossover(parent1: list, parent2: list) -> tuple:
        """Single-point crossover: tukar gen setelah titik potong acak."""
        if random.random() < cx_prob:
            point = random.randint(1, 3)
            child1 = parent1[:point] + parent2[point:]
            child2 = parent2[:point] + parent1[point:]
            return child1, child2
        return parent1[:], parent2[:]

    def mutate(individual: list) -> list:
        """Mutasi gaussian: tambah noise ke setiap gen dengan probabilitas mut_prob."""
        return [
            max(MIN_GREEN, min(MAX_GREEN, gene + random.gauss(0, 5)))
            if random.random() < mut_prob else gene
            for gene in individual
        ]

    # Inisialisasi populasi awal
    population   = init_population()
    best_history = []
    avg_history  = []

    for _ in range(generations):
        # Urutkan populasi berdasarkan fitness (terbaik di depan)
        population.sort(key=fitness_fn)

        # Elitisme: langsung masukkan 'elite' individu terbaik ke generasi baru
        new_population = population[:elite]

        # Isi sisa populasi dengan crossover + mutasi
        while len(new_population) < pop_size:
            parent1 = tournament_select(population)
            parent2 = tournament_select(population)
            child1, child2 = single_point_crossover(parent1, parent2)
            new_population.append(mutate(child1))
            new_population.append(mutate(child2))

        population = new_population[:pop_size]

        # Rekam statistik generasi ini
        fitnesses = [fitness_fn(ind) for ind in population]
        best_history.append(round(min(fitnesses), 4))
        avg_history.append(round(sum(fitnesses) / len(fitnesses), 4))

    return population[0], best_history, avg_history