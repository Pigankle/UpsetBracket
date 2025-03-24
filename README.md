# Upset Bracket

A March Madness bracket picker that helps you track your picks and see how they compare to actual game results. Built with React, TypeScript, and Vite.

## Features

- Interactive bracket interface for making picks
- Real-time comparison with actual game results
- Visual feedback for correct/incorrect picks
- Points tracking based on game results
- Ability to save and load your bracket
- Game code display toggle (S1, FF1, etc.)
- Bracket name customization

## Live Demo

Visit the live demo at: [https://pigankle.github.io/UpsetBracket/](https://pigankle.github.io/UpsetBracket/)

## Local Development

1. Clone the repository:

```bash
git clone https://github.com/pigankle/UpsetBracket.git
cd UpsetBracket
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Building for Production

To build the project for production:

```bash
npm run build
```

The built files will be in the `dist` directory.

## Deployment

This project is configured for GitHub Pages deployment. The site is automatically deployed when changes are pushed to the main branch.

To deploy manually:

1. Build the project:

```bash
npm run build
```

2. Deploy to GitHub Pages:

```bash
npm run deploy
```

## Data Sources

The bracket data is loaded from JSON files:

- `march_madness_games.json`: Contains game results and points
- `bracket_structure.json`: Defines the bracket structure
- `ncaa_2025_bracket.json`: Contains the initial bracket data

## License

MIT License - feel free to use this project for your own purposes.
