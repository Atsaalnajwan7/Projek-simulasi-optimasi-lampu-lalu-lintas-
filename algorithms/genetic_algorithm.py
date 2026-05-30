# algorithms/genetic_algorithm.py
"""
Implementasi Algoritma Genetika (Genetic Algorithm) untuk Optimasi Durasi Lampu Lalu Lintas.
Menggunakan representasi kromosom [Utara, Selatan, Timur, Barat].
Mendukung seleksi Tournament/Roulette, Crossover, Mutasi, dan Elitisme.
"""

import random
from algorithms.hill_climbing import MIN_GREEN, MAX_GREEN

def genetic_algorithm(fitness_fn,
                      pop_size:    int   = 50,
                      generations: int   = 200,
                      cx_prob:     float = 0.8,
                      mut_prob:    float = 0.1,
                      elite_size:  int   = 2,
                      selection_method: str = "tournament",
                      tournament_k:     int = 3) -> tuple:
    """
    Genetic Algorithm untuk alokasi waktu hijau optimal.
    
    Args:
        fitness_fn       : fungsi objektif (minimisasi)
        pop_size         : jumlah individu dalam satu generasi
        generations      : jumlah siklus generasi
        cx_prob          : probabilitas crossover (0-1)
        mut_prob         : probabilitas mutasi per kromosom (0-1)
        elite_size       : jumlah individu terbaik yang langsung lolos ke generasi berikutnya
        selection_method : "tournament" atau "roulette"
        tournament_k     : ukuran turnamen jika menggunakan tournament selection
        
    Returns:
        (best_solution, best_history, avg_history)
        - best_history : list fitness terbaik per generasi
        - avg_history  : list rata-rata fitness populasi per generasi
    """
    
    def init_population() -> list:
        """Membuat populasi awal secara acak."""
        return [[random.uniform(MIN_GREEN, MAX_GREEN) for _ in range(4)] for _ in range(pop_size)]
        
    def tournament_select(population: list, fitnesses: list) -> list:
        """Tournament Selection: Ambil k kandidat acak, pilih yang terbaik (fitness terkecil)."""
        idx_pool = random.sample(range(len(population)), tournament_k)
        best_idx = min(idx_pool, key=lambda idx: fitnesses[idx])
        return population[best_idx][:]
        
    def roulette_select(population: list, fitnesses: list) -> list:
        """Roulette Wheel Selection: Peluang terpilih berbanding terbalik dengan nilai fitness (karena minimisasi)."""
        # Karena kita melakukan minimisasi, ubah fitness menjadi kecocokan (fitness maks - fitness + epsilon)
        max_fit = max(fitnesses)
        adjusted_fitnesses = [max_fit - f + 1e-5 for f in fitnesses]
        total_fit = sum(adjusted_fitnesses)
        
        # Jika total_fit nol (semua sama), kembalikan acak
        if total_fit == 0:
            return random.choice(population)[:]
            
        pick = random.uniform(0, total_fit)
        current_sum = 0
        for i, val in enumerate(adjusted_fitnesses):
            current_sum += val
            if current_sum >= pick:
                return population[i][:]
        return population[-1][:]
        
    def single_point_crossover(parent1: list, parent2: list) -> tuple:
        """Single-point Crossover: Tukar gen setelah titik potong acak."""
        if random.random() < cx_prob:
            point = random.randint(1, 3)
            child1 = parent1[:point] + parent2[point:]
            child2 = parent2[:point] + parent1[point:]
            return child1, child2
        return parent1[:], parent2[:]
        
    def mutate(individual: list) -> list:
        """Gaussian Mutation: Tambahkan noise gauss pada setiap gen dengan probabilitas mut_prob."""
        mutated = individual[:]
        for i in range(4):
            if random.random() < mut_prob:
                # Tambah/kurang acak durasi green time
                mutated[i] = max(MIN_GREEN, min(MAX_GREEN, mutated[i] + random.gauss(0, 5)))
        return mutated
        
    # Inisialisasi populasi
    population = init_population()
    
    best_history = []
    avg_history = []
    
    best_ind = None
    best_fit = float('inf')
    
    for gen in range(generations):
        # Hitung fitness untuk semua individu
        fitnesses = [fitness_fn(ind) for ind in population]
        
        # Temukan individu terbaik di generasi ini
        min_fit = min(fitnesses)
        min_idx = fitnesses.index(min_fit)
        
        if min_fit < best_fit:
            best_fit = min_fit
            best_ind = population[min_idx][:]
            
        # Catat statistik generasi
        best_history.append(round(min_fit, 4))
        avg_history.append(round(sum(fitnesses) / len(fitnesses), 4))
        
        # Elitisme: Simpan n individu terbaik
        sorted_indices = sorted(range(len(fitnesses)), key=lambda idx: fitnesses[idx])
        new_population = [population[idx][:] for idx in sorted_indices[:elite_size]]
        
        # Pilih fungsi seleksi
        select_fn = tournament_select if selection_method == "tournament" else roulette_select
        
        # Buat sisa populasi baru
        while len(new_population) < pop_size:
            p1 = select_fn(population, fitnesses)
            p2 = select_fn(population, fitnesses)
            
            c1, c2 = single_point_crossover(p1, p2)
            
            new_population.append(mutate(c1))
            if len(new_population) < pop_size:
                new_population.append(mutate(c2))
                
        population = new_population[:pop_size]
        
    return best_ind, best_history, avg_history
