# Yearly Tournament Update Instructions

## Step 1 — Update the bracket structure JSON

Edit `src/data/ncaa_2025_bracket.json` (despite the name, this is the file you'll update each year). Replace all team names and seeds with the new bracket. The structure stays the same — 4 regions, each with Round of 64 through Elite Eight, plus `final_four` and `championship`.

**Checkpoint:** The bracket JSON reflects the new 64 teams.

---

## Step 2 — Update the First Four winners

The First Four play-in games are entered as single team entries after the play-in games are played. You can either:
- Wait until First Four games are played and enter the winners directly, or
- Enter them as combined slots (e.g. `"PV A&M/Lehigh"`) until the games are played

**Checkpoint:** All 64 Round of 64 slots show the correct teams.

---

## Step 3 — Update the Final Four pairings

If the bracket committee changes which regions play each other in the Final Four, update `src/utils/bracketTransform.ts`:

```ts
// Change these four lines to match the new pairings:
E15: { nextGame: 'FF1', position: 'top' },
S15: { nextGame: 'FF1', position: 'bottom' },
W15: { nextGame: 'FF2', position: 'top' },
M15: { nextGame: 'FF2', position: 'bottom' },
```

Also double-check the labels in `FinalFourCenter` in `BracketDisplay.tsx` — the game code labels (FF1, FF2) will show automatically when the "Show game codes" checkbox is ticked.

**Checkpoint:** With game codes visible, FF1 and FF2 show the correct region matchups.

---

## Step 4 — Update the submission deadline

In `src/lib/deadline.ts`:

```ts
export const SUBMISSION_DEADLINE = new Date('2027-03-XX T12:00:00-04:00');
```

Replace with the date/time of the first tip-off in ET. Check whether it's EDT (UTC-4, mid-March onward) or EST (UTC-5, before mid-March).

**Checkpoint:** The deadline banner shows the correct date.

---

## Step 5 — Reset the Supabase results table

Run this in the Supabase SQL editor to wipe last year's results:

```sql
truncate table results;
```

Then regenerate the seed SQL from your updated bracket JSON:

```zsh
node -e "
const d = require('./src/data/ncaa_2025_bracket.json');
const esc = s => s ? s.toString().replace(/'/g, \"''\") : '';
const rows = Object.entries(d).map(([code, g]) =>
  \`('\${code}','\${esc(g['Top Team'])}','\${esc(g['Bottom Team'])}',\${g['Winning Team'] ? \"'\" + esc(g['Winning Team']) + \"'\" : 'null'},\${g['Losing Team'] ? \"'\" + esc(g['Losing Team']) + \"'\" : 'null'},\${g['Top Team Seed'] ?? 'null'},\${g['Bottom Team Seed'] ?? 'null'},\${g['Winning Team Seed'] ?? 'null'},\${g['Losing Team Seed'] ?? 'null'},\${g['Winning Team Score'] ?? 'null'},\${g['Losing Team Score'] ?? 'null'},\${g['Top Team Score'] ?? 'null'},\${g['Bottom Team Score'] ?? 'null'},'\${esc(g['Game Status'])}','\${esc(g['Game Region'])}','\${esc(g['Top Team Char6'])}','\${esc(g['Bottom Team Char6'])}','\${esc(g['Winning Team Char6'] ?? '')}','\${esc(g['Losing Team Char6'] ?? '')}',\${g.points})\`
).join(',\n');
console.log('insert into results (game_code,top_team,bottom_team,winning_team,losing_team,top_team_seed,bottom_team_seed,winning_team_seed,losing_team_seed,winning_team_score,losing_team_score,top_team_score,bottom_team_score,game_status,game_region,top_team_char6,bottom_team_char6,winning_team_char6,losing_team_char6,points) values\n' + rows + '\non conflict (game_code) do update set winning_team=excluded.winning_team, losing_team=excluded.losing_team, winning_team_score=excluded.winning_team_score, losing_team_score=excluded.losing_team_score, game_status=excluded.game_status, points=excluded.points;');
"
```

Run the generated INSERT in the Supabase SQL editor.

**Checkpoint:** `select count(*) from results` returns 63. `select * from results where game_status = 'Final'` returns 0.

---

## Step 6 — Archive and reset the brackets table

If you want to keep last year's data:

```sql
create table brackets_2026 as select * from brackets;
```

Then wipe for the new year:

```sql
truncate table brackets;
```

**Checkpoint:** `select count(*) from brackets` returns 0.

---

## Step 7 — Update the app title/year

Search for the old year in the codebase and update everywhere:

```zsh
grep -rn "2026" src/ --include="*.ts" --include="*.tsx"
```

Files to update:
- `src/App.tsx` — nav title and h1 heading
- `src/components/AuthPage.tsx` — page heading
- `src/lib/deadline.ts` — year in the deadline date

---

## Step 8 — Deploy

```zsh
git add .
git commit -m "update bracket for 2027 tournament"
git push
```

Vercel will auto-deploy on push. Verify the live URL shows the new bracket with the correct teams.

---

## Step 9 — Create user accounts

For any new pool members, use the `create_user` SQL function in the Supabase SQL editor:

```sql
select create_user('email@example.com', 'TemporaryPassword1!', 'Display Name');
```

For admins:

```sql
update profiles set is_admin = true
where id = (select id from auth.users where email = 'admin@example.com');
```

---

## Step 10 — Entering results during the tournament

Use the **⚙ Results** tab (admin login required) to enter winners as games are played. Scores update automatically.

If scores ever get out of sync, run this in the Supabase SQL editor:

```sql
update brackets set total_score = calculate_bracket_score(picks);
```

---

## Scoring reference

Scores are calculated as: `round_points × max(1, winner_seed − loser_seed)`

| Round | Base points |
|-------|-------------|
| Round of 64 | 2 |
| Round of 32 | 3 |
| Sweet 16 | 5 |
| Elite Eight | 8 |
| Final Four | 13 |
| Championship | 21 |

Example: 12 seed beats 5 seed in Round of 64 = `2 × (12 − 5)` = **14 points**
