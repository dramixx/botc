#!/bin/sh
# Started by the nginx image entrypoint before nginx: the live relay, restarted if it ever stops.
(
  while true; do
    node /opt/live/live.mjs
    echo "live relay stopped, restarting in 1 s" >&2
    sleep 1
  done
) &
