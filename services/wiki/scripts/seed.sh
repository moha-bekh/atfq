#!/bin/bash
set -e

# Configuration de l'URL de la DB (Port 5434 mappé par Docker)
DB_URL="postgresql://atfq:atfq@localhost:5434/atfq_db"

echo "🚀 Seeding Wiki Database..."

# Fonction pour insérer un nœud et sa version approuvée
seed_article() {
    local title=$1
    local content=$2
    local order=$3
    
    echo "Creating article: $title"
    
    # -q: quiet (supprime "INSERT 0 1")
    # -A: unaligned (pas d'espaces de padding)
    # -t: tuples only (pas d'entêtes de colonnes)
    
    # 1. Insert Node
    node_id=$(psql "$DB_URL" -qAt -c "INSERT INTO nodes (type, order_index) VALUES ('article', $order) RETURNING id;")
    
    # 2. Insert Approved Version
    version_id=$(psql "$DB_URL" -qAt -c "INSERT INTO node_versions (node_id, title, content, created_by, status, activated_at) VALUES ($node_id, '$title', '$content', 1, 'approved', NOW()) RETURNING id;")
    
    # 3. Link Node to Version
    psql "$DB_URL" -qAt -c "UPDATE nodes SET current_version_id = $version_id WHERE id = $node_id;"
}

# Nettoyer les données existantes
psql "$DB_URL" -qAt -c "TRUNCATE nodes, node_versions CASCADE;"

# Seed des articles de base
seed_article "Operating Systems" "Scheduling policies define how the operating system chooses the next process to run. Different algorithms balance performance, fairness, and responsiveness in different ways." 1
seed_article "Network" "The OSI model (Open Systems Interconnection) is a conceptual framework used to understand network interactions in seven layers." 2
seed_article "Getting Started" "Welcome to the ATFQ Wiki. This is a collaborative platform for Computer Science knowledge." 0

echo "✅ Seed complete!"
