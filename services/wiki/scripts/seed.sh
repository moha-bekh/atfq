#!/bin/bash
set -e

# Configuration de l'URL de la DB (Port 5434 mappé par Docker)
DB_URL="postgresql://atfq:atfq@localhost:5434/atfq_db"

echo "Seeding Wiki Database..."

seed_node() {
    local parent_id="$1"
    local node_type="$2"
    local title="$3"
    local content="$4"
    local order_index="$5"
    local parent_sql="NULL"

    if [ -n "$parent_id" ]; then
        parent_sql="$parent_id"
    fi

    psql "$DB_URL" -qAt <<SQL
WITH new_node AS (
    INSERT INTO nodes (parent_id, type, order_index)
    VALUES ($parent_sql, '$node_type', $order_index)
    RETURNING id
),
new_version AS (
    INSERT INTO node_versions (node_id, title, content, created_by, status, activated_at)
    VALUES ((SELECT id FROM new_node), \$TITLE\$$title\$TITLE\$, \$CONTENT\$$content\$CONTENT\$, 1, 'approved', NOW())
    RETURNING id, node_id
),
question_metadata AS (
    INSERT INTO questions (node_version_id, metadata)
    SELECT id, '{}'::jsonb FROM new_version
    WHERE '$node_type' = 'question'
)
UPDATE nodes
SET current_version_id = (SELECT id FROM new_version)
WHERE id = (SELECT node_id FROM new_version)
RETURNING id;
SQL
}

seed_child() {
    local parent_id="$1"
    local node_type="$2"
    local title="$3"
    local content="$4"
    local order_index="$5"

    seed_node "$parent_id" "$node_type" "$title" "$content" "$order_index" > /dev/null
}

# Nettoyer les données existantes
psql "$DB_URL" -qAt -c "TRUNCATE nodes, node_versions, questions CASCADE;"

os_id=$(seed_node "" "article" "Operating Systems" "An operating system coordinates hardware resources and provides abstractions that programs can use: processes, files, virtual memory, permissions, and I/O. Its role is to make the machine usable while balancing performance, isolation, security, and simplicity." 0)
seed_child "$os_id" "notion" "Process" "A process is an isolated execution instance with its own memory space, file descriptors, and execution state." 1
seed_child "$os_id" "notion" "Scheduling" "The scheduler chooses which process or thread gets CPU time at a given moment. Scheduling strategies balance latency, throughput, fairness, and priority." 2
seed_child "$os_id" "question" "Why must an OS isolate processes?" "To prevent one program from reading or corrupting another program's memory, and to let the system enforce permissions." 3
seed_child "$os_id" "question" "What trade-off does a scheduler make?" "It balances responsiveness, CPU utilization, fairness between tasks, and priority rules." 4

network_id=$(seed_node "" "article" "Network" "Networking explains how machines communicate despite distance, packet loss, latency, heterogeneous formats, and failures. Understanding networking means understanding the abstraction layers that turn physical signals into reliable application exchanges." 1)
seed_child "$network_id" "notion" "Layers" "Layered models separate responsibilities: bit transport, addressing, routing, reliability, encryption, and application formats." 1
seed_child "$network_id" "notion" "Protocols" "A protocol defines valid messages, their order, their meaning, and the expected reactions when something goes wrong." 2
seed_child "$network_id" "question" "Why split networking into layers?" "To control complexity: each layer solves a specific problem and exposes an interface to the layers above it." 3
seed_child "$network_id" "question" "Why do TCP and UDP coexist?" "Because they optimize for different needs: TCP prioritizes ordered reliability, while UDP prioritizes simplicity, low latency, and application-level control." 4

echo "Seed complete!"
