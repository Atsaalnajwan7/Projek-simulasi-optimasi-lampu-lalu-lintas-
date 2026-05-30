# backend/utils/preprocessor.py
# Bertugas: load traffic.csv dan membuat lookup table

import pandas as pd

def load_traffic(path: str = "data/traffic.csv") -> pd.Series:
    """
    Membaca traffic.csv dan menghitung rata-rata kendaraan
    per junction per jam sebagai lookup table.

    Args:
        path: lokasi file traffic.csv
    Returns:
        pd.Series dengan index (Junction, hour) → rata-rata kendaraan
    """
    df = pd.read_csv(path, parse_dates=["DateTime"])
    df["hour"] = df["DateTime"].dt.hour

    # Rata-rata kendaraan per junction per jam
    lookup = df.groupby(["Junction", "hour"])["Vehicles"].mean()
    return lookup