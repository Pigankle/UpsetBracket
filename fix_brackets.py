import json
import glob
import os

# Get all JSON files in the brackets directory
bracket_files = glob.glob('src/brackets/*.json')

for file_path in bracket_files:
    # Read the JSON file
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    # Update the matchups
    for matchup in data['matchups']:
        if matchup['gameCode'] == 'FF1' and matchup.get('nextMatchupIndex') == 61:
            matchup['nextMatchupIndex'] = 62
        elif matchup['gameCode'] == 'FF2' and matchup.get('nextMatchupIndex') == 60:
            matchup['nextMatchupIndex'] = 62
    
    # Write back to the file with proper indentation
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2)
