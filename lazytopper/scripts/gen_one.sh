#!/bin/bash
cd "$(dirname "$0")/.."
LOGFILE="/tmp/visual_gen_all.log"

SUBJECTS_CHAPTERS=(
  "maths:real-numbers"
  "maths:polynomials"
  "maths:linear-equations"
  "maths:quadratic-equations"
  "maths:arithmetic-progression"
  "maths:triangles"
  "maths:coordinate-geometry"
  "maths:trigonometry"
  "maths:circles"
  "maths:areas-circles"
  "maths:surface-areas-volumes"
  "maths:statistics"
  "maths:probability"
  "science:chemical-reactions"
  "science:acids-bases-salts"
  "science:metals-nonmetals"
  "science:carbon-compounds"
  "science:life-processes"
  "science:control-coordination"
  "science:reproduction"
  "science:heredity-evolution"
  "science:light"
  "science:human-eye"
  "science:electricity"
  "science:magnetic-effects"
  "science:environment"
)

echo "=== Visual Generation Started at $(date) ===" >> "$LOGFILE"

for entry in "${SUBJECTS_CHAPTERS[@]}"; do
  IFS=':' read -r subj ch <<< "$entry"
  echo "[$(date +%H:%M:%S)] Starting $subj/$ch" >> "$LOGFILE"
  node scripts/generateVisuals.mjs --subject="$subj" --chapter="$ch" >> "$LOGFILE" 2>&1
  echo "[$(date +%H:%M:%S)] Done $subj/$ch" >> "$LOGFILE"
done

echo "=== Visual Generation Complete at $(date) ===" >> "$LOGFILE"
echo "Total files: $(find public/visuals -name '*.html' | wc -l)" >> "$LOGFILE"
