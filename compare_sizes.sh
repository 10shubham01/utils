#!/bin/bash

printf "%-40s %12s %12s %12s\n" "Filename" "Original(MB)" "720p(MB)" "Saved(MB)"
printf "%-40s %12s %12s %12s\n" "--------" "------------" "--------" "---------"

for f in *.mp4; do
  orig="$f"
  conv="720p_videos/$f"

  if [[ -f "$conv" ]]; then
    orig_size=$(du -m "$orig" | cut -f1)
    conv_size=$(du -m "$conv" | cut -f1)
    saved=$((orig_size - conv_size))

    printf "%-40s %12d %12d %12d\n" "$f" "$orig_size" "$conv_size" "$saved"
  fi
done
