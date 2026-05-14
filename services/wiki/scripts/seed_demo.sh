#!/bin/bash
set -euo pipefail

DB_URL="${WIKI_DEMO_DATABASE_URL:-postgresql://atfq:atfq@localhost:5434/atfq_db}"
AUTHOR_ID="${WIKI_DEMO_AUTHOR_ID:-1}"
RESOURCE_LABEL="${WIKI_DEMO_RESOURCE_LABEL:-ATFQ demo dataset}"

echo "Seeding Wiki demo database..."

psql_exec() {
    psql "$DB_URL" -v ON_ERROR_STOP=1 -qAt "$@"
}

article_content() {
    local tldr="$1"

    printf '%s\n\n<!-- ATFQ_RESOURCES:[{"label":"%s","url":null}] -->' "$tldr" "$RESOURCE_LABEL"
}

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

    local node_id
    node_id=$(psql_exec <<SQL
INSERT INTO nodes (parent_id, type, order_index)
VALUES ($parent_sql, '$node_type', $order_index)
RETURNING id;
SQL
)

    local version_id
    version_id=$(psql_exec <<SQL
INSERT INTO node_versions (node_id, title, content, created_by, status, activated_at)
VALUES ($node_id, \$TITLE\$$title\$TITLE\$, \$CONTENT\$$content\$CONTENT\$, $AUTHOR_ID, 'approved', NOW())
RETURNING id;
SQL
)

    if [ "$node_type" = "question" ]; then
        psql_exec <<SQL > /dev/null
INSERT INTO questions (node_version_id, metadata)
VALUES ($version_id, '{}'::jsonb);
SQL
    fi

    psql_exec <<SQL > /dev/null
UPDATE nodes
SET current_version_id = $version_id
WHERE id = $node_id;
SQL

    echo "$node_id"
}

seed_child() {
    local parent_id="$1"
    local node_type="$2"
    local title="$3"
    local content="$4"
    local order_index="$5"

    if [ "$node_type" = "notion" ]; then
        content=""
    elif [ "$node_type" = "question" ]; then
        content="$title"
    fi

    seed_node "$parent_id" "$node_type" "$title" "$content" "$order_index" > /dev/null
}

seed_article() {
    local parent_id="$1"
    local title="$2"
    local tldr="$3"
    local order_index="$4"

    seed_node "$parent_id" "article" "$title" "$(article_content "$tldr")" "$order_index"
}

seed_article_details() {
    local article_id="$1"
    shift

    local order_index=1
    while [ "$#" -gt 0 ]; do
        local node_type="$1"
        local title="$2"
        local content="$3"
        seed_child "$article_id" "$node_type" "$title" "$content" "$order_index"
        order_index=$((order_index + 1))
        shift 3
    done
}

psql_exec -c "TRUNCATE nodes, node_versions, questions RESTART IDENTITY CASCADE;"

os_id=$(seed_article "" "Operating Systems" "Operating systems manage hardware resources, coordinate processes, abstract low-level machine details, and provide stable environments for applications to run efficiently and securely." 1)
processes_id=$(seed_article "$os_id" "Processes" "Processes are independent executing programs with isolated memory and resources managed by the operating system." 1)
process_lifecycle_id=$(seed_article "$processes_id" "Process Lifecycle" "Processes transition through states such as ready, running, waiting, and terminated during execution." 1)
threads_vs_processes_id=$(seed_article "$processes_id" "Threads vs Processes" "Threads share memory within a process while processes maintain isolated memory spaces." 2)
cpu_scheduling_id=$(seed_article "$os_id" "CPU Scheduling" "CPU scheduling determines which process runs next to maximize fairness, responsiveness, and efficiency." 2)
scheduling_basics_id=$(seed_article "$cpu_scheduling_id" "Scheduling Basics" "Scheduling systems distribute CPU time among competing processes." 1)
scheduling_policies_id=$(seed_article "$cpu_scheduling_id" "Scheduling Policies & Algorithms" "Scheduling algorithms define strategies for process prioritization and CPU allocation." 2)
memory_management_id=$(seed_article "$os_id" "Memory Management" "Memory management controls how memory is allocated, protected, and shared among processes." 3)
paging_id=$(seed_article "$memory_management_id" "Paging" "Paging divides memory into fixed-size blocks to simplify allocation and virtualization." 1)
file_systems_id=$(seed_article "$os_id" "File Systems" "File systems organize, store, and retrieve persistent data on storage devices." 4)

db_id=$(seed_article "" "Database Systems" "Database systems organize, store, retrieve, and maintain data efficiently while ensuring consistency and reliability." 2)
relational_db_id=$(seed_article "$db_id" "Relational Databases" "Relational databases structure data into tables connected through relationships." 1)
joins_id=$(seed_article "$relational_db_id" "Joins" "Joins combine rows from multiple tables using shared relationships." 1)
transactions_id=$(seed_article "$db_id" "Transactions" "Transactions ensure database operations execute reliably and consistently." 2)
isolation_levels_id=$(seed_article "$transactions_id" "Isolation Levels" "Isolation levels define how concurrent transactions interact with each other." 1)
distributed_db_id=$(seed_article "$db_id" "Distributed Databases" "Distributed databases spread data across multiple machines to improve scalability and reliability." 3)
cap_theorem_id=$(seed_article "$distributed_db_id" "CAP Theorem" "Distributed systems cannot simultaneously guarantee consistency, availability, and partition tolerance." 1)

cybersecurity_id=$(seed_article "" "Cybersecurity" "Cybersecurity protects systems, networks, and data against unauthorized access, attacks, and failures." 3)
cryptography_id=$(seed_article "$cybersecurity_id" "Cryptography" "Cryptography secures information through mathematical techniques for confidentiality and integrity." 1)
public_key_crypto_id=$(seed_article "$cryptography_id" "Public Key Cryptography" "Public key cryptography enables secure communication without sharing secret keys beforehand." 1)
web_security_id=$(seed_article "$cybersecurity_id" "Web Security" "Web security protects web applications from attacks targeting browsers, servers, and user sessions." 2)
sql_injection_id=$(seed_article "$web_security_id" "SQL Injection" "SQL injection occurs when malicious input manipulates database queries." 1)
network_security_id=$(seed_article "$cybersecurity_id" "Network Security" "Network security protects communications and infrastructure against interception and unauthorized access." 3)

ai_id=$(seed_article "" "Artificial Intelligence" "Artificial intelligence enables systems to perform tasks involving reasoning, prediction, learning, and pattern recognition." 4)
machine_learning_id=$(seed_article "$ai_id" "Machine Learning" "Machine learning trains models to recognize patterns from data instead of relying on explicit instructions." 1)
gradient_descent_id=$(seed_article "$machine_learning_id" "Gradient Descent" "Gradient descent iteratively minimizes model error by adjusting parameters." 1)
neural_networks_id=$(seed_article "$ai_id" "Neural Networks" "Neural networks learn hierarchical representations through layers of interconnected neurons." 2)
transformers_id=$(seed_article "$neural_networks_id" "Transformers" "Transformers process sequential information using attention mechanisms instead of recurrence." 1)
llm_id=$(seed_article "$ai_id" "Large Language Models" "Large language models predict and generate text using massive transformer-based architectures trained on large corpora." 3)

seed_article_details "$os_id" \
    "notion" "Processes and threads" "Execution units used by operating systems to run programs concurrently." \
    "notion" "Scheduling" "The OS policy for deciding which runnable work receives CPU time next." \
    "notion" "Memory management" "Techniques for allocating, protecting, and reclaiming memory across programs." \
    "notion" "Virtual memory" "An address-space abstraction that decouples program memory from physical RAM." \
    "notion" "File systems" "Persistent organization of files, directories, metadata, and storage blocks." \
    "notion" "System calls" "Controlled entry points that let applications request kernel services." \
    "notion" "Concurrency" "The ability to make progress on multiple tasks over overlapping time periods." \
    "notion" "Isolation" "Boundaries that keep programs from corrupting or reading each other's resources." \
    "question" "What responsibilities does an operating system have?" "It manages hardware, processes, memory, storage, permissions, and application-facing abstractions." \
    "question" "How does the OS manage multiple programs simultaneously?" "It schedules execution, isolates address spaces, multiplexes I/O, and tracks process state." \
    "question" "Why is memory virtualization necessary?" "It gives each process a stable private address space while enabling protection and efficient allocation." \
    "question" "How does the kernel interact with hardware?" "It uses drivers, interrupts, privileged instructions, and controlled system-call interfaces." \
    "question" "What tradeoffs exist between performance and isolation?" "Stronger isolation improves safety but can add context switching, copying, and validation overhead." \
    "question" "What happens when a program makes a system call?" "" \
    "question" "How do interrupts change what the CPU is doing?" ""

seed_article_details "$processes_id" \
    "notion" "Process lifecycle" "The sequence of states a process moves through while it exists." \
    "notion" "Process Control Block" "Kernel data that records a process identifier, registers, state, resources, and scheduling metadata." \
    "notion" "Context switching" "Saving one execution context and restoring another so the CPU can run a different task." \
    "notion" "Parent and child processes" "A relationship created when one process starts another and the OS records lineage." \
    "notion" "Threads" "Execution flows that share a process address space and resources." \
    "question" "What differentiates a process from a thread?" "A process owns isolated resources, while threads share resources inside one process." \
    "question" "Why does context switching have overhead?" "The kernel must save and restore execution state and may disturb CPU caches and TLB entries." \
    "question" "How are processes isolated from each other?" "The OS uses virtual memory, permissions, kernel mediation, and separate resource tables." \
    "question" "What information does the kernel need to remember about a process?" "" \
    "question" "How does process creation affect parent and child state?" "" \
    "question" "When does a process stop being runnable?" ""

seed_article_details "$process_lifecycle_id" \
    "notion" "Ready queue" "The set of processes prepared to run when CPU time becomes available." \
    "notion" "Running state" "The state where a process is actively executing on a CPU." \
    "notion" "Waiting state" "The state where a process cannot continue until an event or I/O completes." \
    "notion" "Scheduler interaction" "The scheduler moves processes between states based on timers, events, and priority." \
    "question" "Why do processes wait?" "They wait for I/O, locks, child processes, timers, or external events." \
    "question" "What triggers state transitions?" "System calls, interrupts, I/O completion, scheduler decisions, and process termination." \
    "question" "How does multitasking work internally?" "The OS rapidly switches CPU time between runnable tasks while preserving each task's state." \
    "question" "How does the OS decide when a waiting process becomes ready again?" "" \
    "question" "What state changes happen when a process exits?" ""

seed_article_details "$threads_vs_processes_id" \
    "notion" "Shared memory" "Memory visible to multiple threads in the same process." \
    "notion" "Concurrency" "Multiple execution flows that can progress over overlapping periods." \
    "notion" "Lightweight execution" "A lower-cost execution model because threads reuse process resources." \
    "notion" "Synchronization" "Coordination mechanisms that protect shared state from races." \
    "question" "Why are threads more lightweight?" "They share address space and resources, so creating and switching them often costs less." \
    "question" "What problems arise with shared memory?" "Race conditions, deadlocks, visibility bugs, and data corruption can occur." \
    "question" "When should processes be preferred?" "Use processes when fault isolation, security boundaries, or independent lifecycles matter more." \
    "question" "How does a thread crash affect the rest of its process?" "" \
    "question" "Why does shared memory require synchronization?" "" \
    "question" "How do processes communicate when memory is isolated?" ""

seed_article_details "$cpu_scheduling_id" \
    "notion" "Preemption" "The OS interrupting a running task to give another task CPU time." \
    "notion" "Time slicing" "Dividing CPU time into bounded intervals assigned to runnable tasks." \
    "notion" "Scheduling queues" "Queues used to organize tasks by readiness, priority, or resource needs." \
    "notion" "Context switching" "The mechanism that lets the CPU move from one task to another." \
    "notion" "Fairness" "The goal of giving competing tasks reasonable access to CPU resources." \
    "question" "Why is scheduling necessary?" "Most systems have more runnable work than CPUs, so the OS must choose what runs." \
    "question" "What makes a scheduling algorithm fair?" "It avoids starvation and distributes CPU time according to clear policy goals." \
    "question" "How do operating systems balance responsiveness and throughput?" "They tune priorities, time slices, preemption, and queues for interactive and batch workloads." \
    "question" "What changes when scheduling happens on multiple cores?" "" \
    "question" "How can priorities improve or harm fairness?" ""

seed_article_details "$scheduling_basics_id" \
    "notion" "CPU bursts" "Periods where a process primarily uses the CPU." \
    "notion" "I/O bursts" "Periods where a process waits for input or output." \
    "notion" "Ready queue" "The queue of tasks that can run as soon as CPU time is assigned." \
    "notion" "Dispatcher" "The OS component that hands the CPU to the chosen task." \
    "question" "Why can't all processes run simultaneously?" "A machine has a limited number of CPUs or cores, so runnable tasks must share them." \
    "question" "What is the role of the dispatcher?" "It performs the actual switch into the selected process or thread." \
    "question" "How does time slicing improve interactivity?" "It prevents one task from monopolizing the CPU for too long." \
    "question" "How do CPU-bound and I/O-bound tasks behave differently?" "" \
    "question" "What does a ready queue reveal about system load?" "" \
    "question" "Why does dispatch latency matter?" ""

seed_article_details "$scheduling_policies_id" \
    "notion" "FCFS" "First-Come, First-Served runs tasks in arrival order." \
    "notion" "Round Robin" "Round Robin cycles through tasks using fixed time slices." \
    "notion" "Shortest Job First" "Shortest Job First prioritizes work expected to complete soonest." \
    "notion" "Priority Scheduling" "Priority Scheduling chooses tasks based on assigned importance." \
    "notion" "Multilevel Queues" "Multilevel Queues separate workloads into different scheduling classes." \
    "question" "Why is Round Robin widely used?" "It is simple and gives interactive tasks regular CPU access." \
    "question" "What makes SJF theoretically optimal?" "If job lengths are known, it minimizes average waiting time." \
    "question" "How can starvation occur?" "Lower-priority or longer tasks may wait indefinitely if favored work keeps arriving." \
    "question" "Why is predicting job length difficult in practice?" "" \
    "question" "How does aging reduce starvation?" ""

seed_article_details "$memory_management_id" \
    "notion" "Paging" "Dividing virtual and physical memory into fixed-size units." \
    "notion" "Segmentation" "Dividing memory into logical variable-sized regions." \
    "notion" "Virtual memory" "The abstraction that gives each process its own address space." \
    "notion" "Address translation" "Mapping virtual addresses to physical memory locations." \
    "notion" "Memory protection" "Rules that prevent invalid or unauthorized memory access." \
    "question" "Why is virtual memory necessary?" "It simplifies programming, improves protection, and lets the OS manage physical memory flexibly." \
    "question" "How does paging reduce fragmentation?" "Fixed-size pages avoid many external fragmentation problems." \
    "question" "What happens during a page fault?" "The CPU traps to the kernel, which resolves the missing mapping or terminates the process." \
    "question" "How does address translation protect one process from another?" "" \
    "question" "What tradeoffs exist between paging and segmentation?" "" \
    "question" "Why can memory management affect performance so much?" ""

seed_article_details "$paging_id" \
    "notion" "Pages" "Fixed-size blocks of virtual memory." \
    "notion" "Frames" "Fixed-size blocks of physical memory that hold pages." \
    "notion" "Page tables" "Data structures that map virtual pages to physical frames." \
    "notion" "TLB" "A CPU cache for recent virtual-to-physical address translations." \
    "question" "How are virtual addresses translated?" "The hardware and OS consult page tables, often accelerated by the TLB." \
    "question" "Why are TLBs important?" "They avoid expensive page-table walks for common memory accesses." \
    "question" "What causes page faults?" "A page may be absent, protected, swapped out, or otherwise unmapped." \
    "question" "How do page sizes change memory overhead?" "" \
    "question" "What information lives inside a page table entry?" ""

seed_article_details "$file_systems_id" \
    "notion" "Directories" "Structures that map names to files and subdirectories." \
    "notion" "Inodes" "Metadata records that describe files and where their data lives." \
    "notion" "Journaling" "Recording intended changes before applying them to recover after crashes." \
    "notion" "Block storage" "Storage organized into fixed-size blocks." \
    "notion" "Metadata" "Information such as ownership, timestamps, permissions, and file layout." \
    "question" "How are files represented internally?" "File systems store metadata and references to blocks containing file data." \
    "question" "Why is journaling important?" "It improves consistency and recovery when a crash interrupts writes." \
    "question" "What tradeoffs exist between speed and reliability?" "Caching and delayed writes improve speed but can risk data loss without safeguards." \
    "question" "How do directories map human names to stored data?" "" \
    "question" "What must a file system recover after a crash?" ""

seed_article_details "$db_id" \
    "notion" "Relational models" "A table-based model that represents data as relations." \
    "notion" "Transactions" "Groups of operations treated as one reliable unit." \
    "notion" "Indexes" "Data structures that speed up lookup and ordering." \
    "notion" "Query optimization" "Choosing an efficient execution plan for a query." \
    "notion" "Replication" "Maintaining copies of data on multiple machines." \
    "notion" "Consistency" "The guarantee that data respects defined rules and expected visibility." \
    "question" "Why are databases necessary?" "They provide durable, queryable, concurrent, and consistent data management." \
    "question" "How do databases ensure consistency?" "They use constraints, transactions, isolation, logging, and recovery protocols." \
    "question" "What tradeoffs exist in distributed systems?" "Systems balance consistency, availability, latency, cost, and partition tolerance." \
    "question" "When is a database better than a plain file?" "" \
    "question" "How does an index change the cost of reads and writes?" "" \
    "question" "Why does query planning matter?" ""

seed_article_details "$relational_db_id" \
    "notion" "Tables" "Named relations made of rows and columns." \
    "notion" "Rows" "Individual records in a table." \
    "notion" "Primary keys" "Columns that uniquely identify rows." \
    "notion" "Foreign keys" "References that connect rows across tables." \
    "notion" "SQL" "A language for defining, querying, and modifying relational data." \
    "question" "Why are relations useful?" "They make data structure explicit and support declarative querying." \
    "question" "What is normalization?" "A design process that reduces redundancy and update anomalies." \
    "question" "How do joins combine data?" "They match rows from different tables using related values." \
    "question" "Why do primary keys matter for data integrity?" "" \
    "question" "What problems do foreign keys prevent?" ""

seed_article_details "$joins_id" \
    "notion" "INNER JOIN" "A join that returns only matching rows from both sides." \
    "notion" "LEFT JOIN" "A join that keeps all rows from the left side and matching rows from the right." \
    "notion" "Relationship mapping" "Using keys to express how records relate." \
    "notion" "Cartesian products" "All possible combinations of rows from two inputs." \
    "question" "Why are joins computationally expensive?" "They may require comparing many rows, moving data, sorting, or hashing." \
    "question" "How does indexing improve joins?" "Indexes help the database find matching rows faster." \
    "question" "What is the difference between INNER and LEFT JOIN?" "INNER JOIN keeps matches only; LEFT JOIN also keeps unmatched left-side rows." \
    "question" "When can a join accidentally duplicate rows?" "" \
    "question" "How does join order affect query performance?" "" \
    "question" "Why can a missing join condition be dangerous?" ""

seed_article_details "$transactions_id" \
    "notion" "ACID" "Atomicity, Consistency, Isolation, and Durability properties for reliable transactions." \
    "notion" "Isolation levels" "Rules controlling how transactions observe one another." \
    "notion" "Atomicity" "All operations in a transaction succeed or none do." \
    "notion" "Durability" "Committed changes survive crashes." \
    "notion" "Rollbacks" "Reverting a transaction's changes when it cannot commit." \
    "question" "Why are transactions necessary?" "They protect data correctness when operations fail or run concurrently." \
    "question" "What causes dirty reads?" "A transaction reads uncommitted changes from another transaction." \
    "question" "How does isolation affect performance?" "Stronger isolation can reduce concurrency or add coordination overhead." \
    "question" "What should happen if one step of a transaction fails?" "" \
    "question" "How does durability survive process or machine crashes?" ""

seed_article_details "$isolation_levels_id" \
    "notion" "Read committed" "A level where transactions only read committed data." \
    "notion" "Repeatable read" "A level that prevents a row read from changing during the transaction." \
    "notion" "Serializable" "A level that makes concurrent transactions behave like a serial order." \
    "notion" "Phantom reads" "New matching rows appearing between repeated predicate reads." \
    "question" "What anomalies can occur with concurrency?" "Dirty reads, non-repeatable reads, phantom reads, lost updates, and write skew." \
    "question" "Why is serializable isolation expensive?" "It may require more locking, validation, retries, or dependency tracking." \
    "question" "How do databases balance correctness and performance?" "They expose isolation levels so applications can choose appropriate guarantees." \
    "question" "What is the difference between a dirty read and a non-repeatable read?" "" \
    "question" "When is read committed not strong enough?" "" \
    "question" "How can write skew break an invariant?" ""

seed_article_details "$distributed_db_id" \
    "notion" "Replication" "Copying data across nodes for availability and read scalability." \
    "notion" "Sharding" "Splitting data across nodes by key or range." \
    "notion" "Consensus" "Agreement among nodes despite failures." \
    "notion" "CAP theorem" "A framework describing consistency, availability, and partition-tolerance tradeoffs." \
    "question" "Why distribute databases?" "To scale capacity, improve availability, reduce latency, and tolerate failures." \
    "question" "What is eventual consistency?" "A model where replicas converge over time if no new updates occur." \
    "question" "Why is consensus difficult?" "Nodes can fail, messages can be delayed, and participants must still agree safely." \
    "question" "How does sharding change query design?" "" \
    "question" "What can go wrong when replicas disagree?" ""

seed_article_details "$cap_theorem_id" \
    "notion" "Network partitions" "Failures where nodes cannot reliably communicate." \
    "notion" "Tradeoffs" "Design choices forced by failure modes and system goals." \
    "notion" "Strong consistency" "A guarantee that reads observe the latest committed write." \
    "notion" "Availability" "The ability to return a response for each request." \
    "question" "Why are partitions unavoidable?" "Networks and machines fail, messages drop, and latency spikes happen in real systems." \
    "question" "What systems prioritize consistency?" "Systems that reject or delay requests rather than risk stale or conflicting data." \
    "question" "What systems prioritize availability?" "Systems that continue serving requests during partitions and reconcile later." \
    "question" "Why does CAP focus specifically on partitions?" "" \
    "question" "What does a stale read mean for an application?" "" \
    "question" "How can systems reconcile conflicting writes?" ""

seed_article_details "$cybersecurity_id" \
    "notion" "Authentication" "Verifying who a user or system claims to be." \
    "notion" "Encryption" "Transforming data so unauthorized parties cannot read it." \
    "notion" "Threat models" "Structured descriptions of attackers, assets, and possible attacks." \
    "notion" "Vulnerabilities" "Weaknesses that attackers can exploit." \
    "notion" "Network security" "Protecting data and systems as they communicate." \
    "notion" "Isolation" "Limiting access and blast radius between components." \
    "question" "What makes systems vulnerable?" "Bugs, weak assumptions, poor configuration, exposed secrets, and unsafe trust boundaries." \
    "question" "How does encryption secure communication?" "It protects confidentiality and, with authentication, helps preserve integrity." \
    "question" "Why is security always a tradeoff?" "Controls affect usability, performance, complexity, cost, and operational flexibility." \
    "question" "How do you decide what needs protection first?" "" \
    "question" "What is the difference between authentication and authorization?" "" \
    "question" "How does isolation reduce blast radius?" ""

seed_article_details "$cryptography_id" \
    "notion" "Symmetric encryption" "Encryption where the same secret key encrypts and decrypts data." \
    "notion" "Public key cryptography" "Cryptography using paired public and private keys." \
    "notion" "Hashing" "Mapping input to a fixed-size digest designed to be hard to reverse or collide." \
    "notion" "Digital signatures" "Cryptographic proof that a private key signed data." \
    "question" "Why are public and private keys necessary?" "They enable secure exchange and identity proofs without sharing a single secret first." \
    "question" "What makes hash functions secure?" "Preimage resistance, collision resistance, and predictable avalanche behavior." \
    "question" "How are identities verified online?" "Certificates, signatures, keys, and trusted authorities bind identities to cryptographic material." \
    "question" "When should hashing be used instead of encryption?" "" \
    "question" "Why is key management often the hardest part?" ""

seed_article_details "$public_key_crypto_id" \
    "notion" "RSA" "A public-key cryptosystem based on the difficulty of factoring large integers." \
    "notion" "Key pairs" "Linked public and private keys used for encryption or signatures." \
    "notion" "Encryption" "Using cryptography to protect confidentiality." \
    "notion" "Digital signatures" "Using a private key to prove authenticity and integrity." \
    "question" "Why can public keys be shared openly?" "They do not reveal the private key and are designed for public distribution." \
    "question" "How do signatures verify authenticity?" "A verifier checks that the signature matches the data and the signer's public key." \
    "question" "Why is asymmetric encryption slower?" "It relies on heavier mathematical operations than symmetric cryptography." \
    "question" "How does a certificate connect a key to an identity?" "" \
    "question" "Why do protocols often combine asymmetric and symmetric cryptography?" "" \
    "question" "What happens if a private key leaks?" ""

seed_article_details "$web_security_id" \
    "notion" "XSS" "Injecting script into pages viewed by other users." \
    "notion" "CSRF" "Tricking a browser into sending an unintended authenticated request." \
    "notion" "SQL Injection" "Manipulating database queries through unsafe input." \
    "notion" "Cookies" "Browser-stored values commonly used for sessions and preferences." \
    "notion" "Authentication" "Confirming identity before granting access." \
    "question" "Why is user input dangerous?" "Attackers can craft input that changes parsing, queries, rendering, or control flow." \
    "question" "How does XSS exploit browsers?" "It runs attacker-controlled script in a trusted page context." \
    "question" "What protections prevent CSRF attacks?" "SameSite cookies, CSRF tokens, origin checks, and careful HTTP method semantics." \
    "question" "Why are cookies both useful and risky?" "" \
    "question" "How does output encoding reduce XSS risk?" ""

seed_article_details "$sql_injection_id" \
    "notion" "Unsanitized input" "Input included in queries without safe binding or escaping." \
    "notion" "Prepared statements" "Queries where data is bound separately from SQL code." \
    "notion" "Query execution" "The database parsing, planning, and running SQL commands." \
    "question" "Why are prepared statements safer?" "They prevent user input from being interpreted as SQL syntax." \
    "question" "How can attackers exfiltrate data?" "They can alter query logic to read unauthorized rows or tables." \
    "question" "Why is input validation insufficient alone?" "Validation can miss edge cases; parameter binding enforces code/data separation." \
    "question" "How does SQL injection change the meaning of a query?" "" \
    "question" "Where should authorization be checked around database reads?" ""

seed_article_details "$network_security_id" \
    "notion" "Firewalls" "Policy enforcement points for network traffic." \
    "notion" "TLS" "A protocol that secures communication over networks." \
    "notion" "VPNs" "Encrypted tunnels that connect users or networks." \
    "notion" "Packet inspection" "Examining traffic metadata or payloads for policy and threat detection." \
    "question" "How does TLS secure internet traffic?" "It authenticates endpoints and encrypts data in transit." \
    "question" "Why are VPNs useful?" "They protect traffic across untrusted networks and extend private network access." \
    "question" "What attacks target network protocols?" "Spoofing, interception, replay, downgrade, routing attacks, and denial of service." \
    "question" "What can a firewall know and what can it miss?" "" \
    "question" "How do replay attacks work?" "" \
    "question" "Why does network security depend on configuration?" ""

seed_article_details "$ai_id" \
    "notion" "Machine learning" "Training models to infer patterns from data." \
    "notion" "Neural networks" "Models made of connected layers that learn representations." \
    "notion" "Optimization" "Adjusting parameters to reduce error." \
    "notion" "Data representations" "Ways of encoding inputs so models can process them." \
    "notion" "Inference" "Using a trained model to produce predictions or outputs." \
    "question" "What differentiates AI from traditional programming?" "AI learns behavior from data instead of relying only on explicit rules." \
    "question" "How do models learn patterns?" "Training adjusts parameters to reduce prediction error on examples." \
    "question" "Why do large models require massive datasets?" "More parameters need diverse evidence to learn useful general patterns." \
    "question" "What does it mean for a system to generalize?" "" \
    "question" "How can an AI system fail even when it is statistically accurate?" "" \
    "question" "Why does representation shape what a model can learn?" ""

seed_article_details "$machine_learning_id" \
    "notion" "Training" "The process of fitting model parameters using examples." \
    "notion" "Features" "Input variables or representations used by a model." \
    "notion" "Labels" "Target outputs used for supervised learning." \
    "notion" "Loss functions" "Functions that measure prediction error." \
    "notion" "Generalization" "A model's ability to perform well on new data." \
    "question" "What is overfitting?" "A model memorizes training data patterns that do not hold on new data." \
    "question" "Why is data quality important?" "Bad, biased, or noisy data teaches the model unreliable patterns." \
    "question" "How do models generalize?" "They learn patterns that transfer beyond the specific examples seen during training." \
    "question" "How do training and evaluation data need to differ?" "" \
    "question" "What does a loss function really measure?" ""

seed_article_details "$gradient_descent_id" \
    "notion" "Loss functions" "Numerical objectives that optimization tries to minimize." \
    "notion" "Optimization" "The process of finding better parameter values." \
    "notion" "Learning rate" "The step size used when updating parameters." \
    "notion" "Convergence" "The process of approaching a stable or good solution." \
    "question" "Why can learning rates be unstable?" "Too large a step can overshoot; too small a step can learn too slowly." \
    "question" "What causes local minima?" "Complex loss surfaces can contain valleys that are not globally optimal." \
    "question" "Why is optimization difficult in deep learning?" "High-dimensional, nonconvex landscapes make training sensitive and expensive." \
    "question" "How does gradient descent know which direction to move?" "" \
    "question" "What happens when gradients vanish or explode?" "" \
    "question" "Why can a smaller loss still produce a worse model?" ""

seed_article_details "$neural_networks_id" \
    "notion" "Weights" "Learned parameters that scale signals between neurons." \
    "notion" "Activations" "Nonlinear transformations applied inside a network." \
    "notion" "Backpropagation" "An algorithm for computing gradients through layers." \
    "notion" "Hidden layers" "Intermediate layers that learn internal representations." \
    "question" "Why are deep networks powerful?" "Multiple layers can compose simple patterns into complex representations." \
    "question" "What role does backpropagation play?" "It efficiently propagates error signals so weights can be updated." \
    "question" "Why do neural networks require large datasets?" "They have many parameters and need enough examples to learn robust patterns." \
    "question" "What do hidden layers learn?" "" \
    "question" "Why do activations need to be nonlinear?" ""

seed_article_details "$transformers_id" \
    "notion" "Attention" "A mechanism for weighting relationships between tokens." \
    "notion" "Tokens" "Discrete chunks of input text or data processed by the model." \
    "notion" "Embeddings" "Vector representations of tokens or other entities." \
    "notion" "Context windows" "The amount of input a model can consider at once." \
    "question" "Why are transformers scalable?" "Self-attention and parallel training fit modern accelerator hardware well." \
    "question" "How does attention work?" "It compares token representations and uses the scores to mix relevant information." \
    "question" "Why are transformers effective for language?" "They model long-range dependencies and contextual token relationships." \
    "question" "What information is lost or changed during tokenization?" "" \
    "question" "Why does context length matter for reasoning over text?" "" \
    "question" "How do embeddings encode relationships between tokens?" ""

seed_article_details "$llm_id" \
    "notion" "Tokenization" "Splitting text into model-readable units." \
    "notion" "Pretraining" "Learning broad language patterns from large corpora." \
    "notion" "Fine-tuning" "Adapting a pretrained model to a narrower task or behavior." \
    "notion" "RLHF" "Reinforcement learning from human feedback to shape model behavior." \
    "notion" "Inference" "Generating outputs from a trained model." \
    "question" "How do LLMs generate coherent text?" "They predict likely next tokens conditioned on previous context and learned patterns." \
    "question" "What are hallucinations?" "Confident outputs that are unsupported, false, or inconsistent with the available context." \
    "question" "Why are context windows important?" "They limit how much information the model can use at generation time." \
    "question" "How does pretraining differ from fine-tuning?" "" \
    "question" "Why can fluent text still be wrong?" "" \
    "question" "What changes when generation is guided by feedback?" ""

echo "Seed demo complete!"
