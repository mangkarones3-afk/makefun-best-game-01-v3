// CLOUDBRAWL's hand-in program (Node 22, standard library only).
//
// What the grader runs. It takes the entry as it stands in this repository —
// the playable game under game/ and the four screenshots under screenshots/ —
// copies both into the output directory (MAKEFUN_OUTPUT_DIR when set, else
// /output), and writes dossier.json there using the kit's own buildDossier
// from vendor/makefun-game.ts. The scorer rebuilds the dossier from the same
// files with the same library and demands the same bytes, so this program
// builds it twice — once to write, once from the written output to compare —
// and fails loudly here rather than silently there if they ever differ.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { Buffer } from 'node:buffer';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's caps for this bounty, passed whole so a refusal the scorer
// would make is one this program makes first, in the open.
const GATE_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function refuse(message: string): never {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');
if (!existsSync(join(gameDir, 'index.html'))) {
  refuse('game/index.html is missing — there is no game to hand in');
}
const shotFiles = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((name) => !name.startsWith('.'))
  : [];
if (shotFiles.length < 3 || shotFiles.length > 4) {
  refuse(`screenshots/ holds ${shotFiles.length} files; the bounty asks for 3 or 4`);
}

mkdirSync(outputDir, { recursive: true });
cpSync(gameDir, join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outputDir, GATE_CAPS);
writeFileSync(join(outputDir, 'dossier.json'), dossier);

const rebuilt = buildDossier(outputDir, GATE_CAPS);
if (!Buffer.from(rebuilt).equals(readFileSync(join(outputDir, 'dossier.json')))) {
  refuse('the dossier rebuilt from the written output differs from the one on disk');
}

console.log(
  `CLOUDBRAWL handed in: game/ and ${shotFiles.length} screenshots copied to ${outputDir}; ` +
    `dossier.json is ${Buffer.byteLength(dossier)} bytes and rebuilds byte for byte.`,
);
