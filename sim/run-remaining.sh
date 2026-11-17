#!/bin/sh
# run-remaining.sh — the Monte Carlo jobs the parallel shards did not
# finish, run sequentially on a dedicated CPU, then the economy ledger.
cd "$(dirname "$0")/.." || exit 1
printf '%s\n' \
  "wave13 base 20001 10000" \
  "boss10 bosshull-down 20001 10000" \
  "boss10 output-up 20001 10000" \
  "boss10 output-down 20001 10000" \
  "boss15 degraded 20001 10000" | sh sim/run-mc.sh
node sim/montecarlo.mjs ledger 300 > sim/mc-out/ledger.json.tmp && mv sim/mc-out/ledger.json.tmp sim/mc-out/ledger.json
cat sim/mc-out/ledger.json
echo "REMAINING DONE"
