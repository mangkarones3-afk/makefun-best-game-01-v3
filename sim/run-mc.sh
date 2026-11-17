#!/bin/sh
# run-mc.sh — one shard of the Monte Carlo audit: a list of jobs run in
# order, each result landing in sim/mc-out/<matchup>-<variant>.json.
# Jobs: "matchup variant seedStart count"
cd "$(dirname "$0")/.." || exit 1
mkdir -p sim/mc-out
while IFS=' ' read -r matchup variant start count; do
  [ -z "$matchup" ] && continue
  out="sim/mc-out/${matchup}-${variant}.json"
  if [ -s "$out" ]; then echo "skip $out (exists)"; continue; fi
  echo "run $matchup $variant seeds $start..$((start + count - 1))"
  node sim/montecarlo.mjs "$matchup" "$start" "$count" "$variant" > "$out.tmp" && mv "$out.tmp" "$out"
  cat "$out"
done
echo "SHARD DONE"
