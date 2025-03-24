import pandas as pd
import json
import numpy as np

# Replace these with your actual sheet ID and GID
sheet_id = "1DyuuT9zPSh9RdzrAF_1bY6HhyuYKckL3E6wr-sGKZTs"
gid = "914813182"
csv_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={gid}"

# Load the sheet as a DataFrame
df = pd.read_csv(csv_url)

# Clean up column names (remove extra whitespace)
df.columns = [col.strip() for col in df.columns]

# List of columns to drop
columns_to_drop = [
    "Game Data",
    "Start Date",
    "Start Time",
    "Network",
    "Game Day of Week",
    "Alternate Game Bracket Status",
    "Game State"
]
df = df.drop(columns=[col for col in columns_to_drop if col in df.columns])

# Drop rows where "Round" equals 68
df = df[df["Round"] != 68]

# Ensure "Round" is integer for proper comparisons
df["Round"] = df["Round"].astype(int)

# Convert seed columns to nullable integer type (Int64) so that missing values are preserved as NA
df["Winning Team Seed"] = pd.to_numeric(df["Winning Team Seed"], errors="coerce").astype("Int64")
df["Losing Team Seed"] = pd.to_numeric(df["Losing Team Seed"], errors="coerce").astype("Int64")

# --- Define the points calculation function ---
def calculate_points(winning_seed, losing_seed, round_value):
    """
    Calculate game points based on:
      - A base score for the round.
      - Upset scoring: if the winning team's seed is higher (worse) than the losing team's seed,
        multiply the difference by the base score.
      
    Rounds are mapped as follows:
      Round of 64 (64): base = 2
      Round of 32 (32): base = 3
      Round of 16 (16): base = 5
      Round of 8  (8):  base = 8
      Final Four (4):  base = 13
      Championship (2): base = 21
    """
    # If seeds are missing, return 0 points
    if pd.isna(winning_seed) or pd.isna(losing_seed):
        return 0

    round_to_base = {
        64: 2,
        32: 3,
        16: 5,
        8: 8,
        4: 13,
        2: 21
    }
    base = round_to_base.get(round_value, 0)
    
    # If the winning team is favored (i.e. lower or equal seed number), no upset:
    if winning_seed <= losing_seed:
        return base
    else:
        # Upset: multiply the seed difference by the base score
        return base * (winning_seed - losing_seed)

# --- Assign game codes ---
df["game_code"] = ""
region_rounds = [64, 32, 16, 8]
region_mask = df["Round"].isin(region_rounds)
for region, indices in df[region_mask].groupby("Game Region").groups.items():
    subset = df.loc[indices].copy()
    # Sort by "Round" descending then by "Game Number" ascending
    subset = subset.sort_values(by=["Round", "Game Number"], ascending=[False, True])
    for i, idx in enumerate(subset.index, start=1):
        code_prefix = region[0].upper()  # e.g., "S", "E", "W", or "M"
        df.at[idx, "game_code"] = f"{code_prefix}{i}"

# Process Final Four games (assumed to have Round == 4)
final_four_mask = df["Round"] == 4
final_four_subset = df[final_four_mask].sort_values(by="Game Number")
for i, idx in enumerate(final_four_subset.index, start=1):
    df.at[idx, "game_code"] = f"FF{i}"

# Process Championship game (assumed to have Round == 2)
championship_mask = df["Round"] == 2
df.loc[championship_mask, "game_code"] = "CH1"

# --- Compute points for each game ---
df["points"] = df.apply(
    lambda row: calculate_points(row["Winning Team Seed"], row["Losing Team Seed"], row["Round"]),
    axis=1
)

# Function to handle null values consistently
def handle_null_values(value):
    if pd.isna(value) or value == "" or value is None or (isinstance(value, float) and np.isnan(value)):
        return None
    return value

# Apply the null value handling to all columns
for column in df.columns:
    df[column] = df[column].apply(handle_null_values)

# Convert DataFrame to list of dictionaries (JSON-style records)
json_data = df.to_dict(orient="records")

# Process each record to handle null values
processed_records = []
for record in json_data:
    processed_record = {k: handle_null_values(v) for k, v in record.items()}
    processed_records.append(processed_record)

# Reorganize into a dictionary keyed by "game_code", removing the duplicate "game_code" field from each inner record
output_data = {
    record["game_code"]: {k: v for k, v in record.items() if k != "game_code"}
    for record in processed_records
}

# Write the reorganized JSON data to a file
with open("march_madness_games.json", "w", encoding="utf-8") as f:
    json.dump(output_data, f, indent=2)

print("✅ Data saved to march_madness_games.json")
