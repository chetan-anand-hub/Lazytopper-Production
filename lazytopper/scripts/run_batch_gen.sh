#!/bin/bash
cd "$(dirname "$0")/.."
LOGFILE="/tmp/visual_gen_all.log"
echo "=== Visual Generation Started at $(date) ===" > "$LOGFILE"

CHAPTERS_MATHS="real-numbers polynomials linear-equations quadratic-equations arithmetic-progression triangles coordinate-geometry trigonometry circles areas-circles surface-areas-volumes statistics probability"
CHAPTERS_SCIENCE="chemical-reactions acids-bases-salts metals-nonmetals carbon-compounds life-processes control-coordination reproduction heredity-evolution light human-eye electricity magnetic-effects environment"

for ch in $CHAPTERS_MATHS; do
  echo "--- Generating maths/$ch ---" >> "$LOGFILE"
  node scripts/generateVisuals.mjs --subject=maths --chapter="$ch" >> "$LOGFILE" 2>&1
done

for ch in $CHAPTERS_SCIENCE; do
  echo "--- Generating science/$ch ---" >> "$LOGFILE"
  node scripts/generateVisuals.mjs --subject=science --chapter="$ch" >> "$LOGFILE" 2>&1
done

echo "=== Visual Generation Complete at $(date) ===" >> "$LOGFILE"
