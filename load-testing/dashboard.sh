#!/bin/bash

# === CONFIG ===
POSTGRES_CONTAINER="ssjassessment-postgres-1"
REDIS_CONTAINER="ssjassessment-redis-1"
KAFKA_CONTAINER="ssjassessment-kafka-1"
KAFKA_GROUPS=("charts-group" "matching-engine" "websocket-group")  # <-- updated to multiple groups

# === Colors ===
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
NC="\033[0m"

while true; do
  clear
  echo -e "${GREEN}===== SYSTEM PERFORMANCE DASHBOARD (Docker) =====${NC}"
  echo -e "${YELLOW}Time: $(date)${NC}"
  echo ""

  # --- PM2 Node.js Stats ---
  echo -e "${GREEN}--- PM2 Node.js Stats ---${NC}"
  pm2 list
  echo ""

  # --- PostgreSQL Stats via Docker ---
  echo -e "${GREEN}--- PostgreSQL Stats ---${NC}"
  docker exec -i $POSTGRES_CONTAINER psql -U user -d orderbook -c \
    "SELECT count(*) AS active_connections FROM pg_stat_activity WHERE state!='idle';"
  echo ""

  # --- Redis Stats via Docker ---
  echo -e "${GREEN}--- Redis Stats ---${NC}"
  docker exec -i $REDIS_CONTAINER redis-cli INFO keyspace memory clients | grep -E 'used_memory|connected_clients|instantaneous_ops_per_sec'
  echo ""

  # --- Kafka Consumer Lag via Docker ---
  echo -e "${GREEN}--- Kafka Consumer Lag ---${NC}"
  for GROUP in "${KAFKA_GROUPS[@]}"; do
    echo -e "${YELLOW}Consumer Group: $GROUP${NC}"
    docker exec -i $KAFKA_CONTAINER bash -c \
      "/usr/bin/kafka-consumer-groups --bootstrap-server localhost:9092 --describe --group $GROUP" || \
      echo "Kafka consumer group '$GROUP' command failed or group not active yet"
    echo ""
  done

  # --- CPU / Memory (Windows via Git Bash) ---
  echo -e "${GREEN}--- CPU / Memory ---${NC}"
  if command -v wmic &> /dev/null; then
    echo -e "${YELLOW}CPU Load (approx):${NC}"
    wmic cpu get loadpercentage
    echo -e "${YELLOW}Memory Usage (approx):${NC}"
    wmic OS get FreePhysicalMemory,TotalVisibleMemorySize
  else
    echo "WMIC not found; CPU/Memory stats unavailable"
  fi
  echo ""

  sleep 20
done
