import json
import os
from pathlib import Path

def convert_bracket(data):
    """Convert a bracket from the old format to the new format."""
    picks = {}
    name = data.get('name', '')
    
    # Extract just the winners from each matchup
    for matchup in data.get('matchups', []):
        game_code = matchup.get('gameCode')
        winner = matchup.get('winner')
        if game_code and winner:
            # Get the winning team's name
            team = matchup['topTeam'] if winner == 'top' else matchup['bottomTeam']
            picks[game_code] = team['name']
    
    return {
        'name': name,
        'picks': picks
    }

def main():
    brackets_dir = Path('src/brackets')
    
    # Process each JSON file in the brackets directory
    for file_path in brackets_dir.glob('*.json'):
        print(f'Converting {file_path}...')
        
        # Read the original bracket
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        # Convert to new format
        new_data = convert_bracket(data)
        
        # Create a backup of the original file
        backup_path = file_path.with_suffix('.json.bak')
        os.rename(file_path, backup_path)
        
        # Write the new format
        with open(file_path, 'w') as f:
            json.dump(new_data, f, indent=2)
        
        print(f'Converted {file_path} (backup at {backup_path})')

if __name__ == '__main__':
    main()
