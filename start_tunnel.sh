#!/bin/bash
until sudo lt --port $TUNNEL_PORT --subdomain "trakr-project-$TRAKR_PROJECT_ID"; do
    echo "Server crashed with exit code $?.  Respawning.." >&2
    sleep 1
done
