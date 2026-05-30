# backend/utils/fitness.py
# Bertugas: mendefinisikan fungsi objektif untuk semua algoritma

import pandas as pd

# Konstanta batas green time (detik)
MIN_GREEN = 20
MAX_GREEN = 90
CAPACITY_FACTOR = 0.5   # kapasitas = green_time * faktor ini

def fitness(green_time: list, lookup: pd.Series) -> float:
    """
    Menghitung total kendaraan tertunda di semua junction semua jam.
    Nilai lebih kecil = solusi lebih baik (minimisasi).

    Args:
        green_time : list 4 nilai [g1, g2, g3, g4] dalam detik
        lookup     : lookup table dari preprocessor.load_traffic()
    Returns:
        float — total antrean kendaraan (nilai objektif)
    """
    total_queue = 0.0
    for junction in range(1, 5):            # junction 1 s/d 4
        for hour in range(24):              # jam 0 s/d 23
            demand = lookup.get((junction, hour), 0)
            capacity = green_time[junction - 1] * CAPACITY_FACTOR
            # Antrean terjadi kalau demand melebihi kapasitas
            total_queue += max(0.0, demand - capacity)
    return total_queue