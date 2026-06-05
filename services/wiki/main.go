package main

import (
	"bufio"
	"embed"
	"flag"
	"fmt"
	"log"
	"net"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq" // PostgreSQL driver
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	pb "wiki/proto/wiki/v1"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

var (
	bypass_moderation = flag.Bool("bypass", false, "bypass moderation")
	portFlag          = flag.Int("port", 0, "The port to serve gRPC on")
)

func loadEnvFile(path string) {
	file, err := os.Open(path)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		value = strings.Trim(strings.TrimSpace(value), `"`)
		if _, exists := os.LookupEnv(key); !exists {
			_ = os.Setenv(key, value)
		}
	}
}

func getPort() int {
	// 1. Check flag
	if portFlag != nil && *portFlag != 0 {
		return *portFlag
	}
	// 2. Check ENV
	if p := os.Getenv("PORT"); p != "" {
		var port int
		if _, err := fmt.Sscanf(p, "%d", &port); err == nil {
			return port
		}
	}
	// 3. Default
	return 8080
}

func intEnv(name string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		return fallback
	}

	var parsed int
	if _, err := fmt.Sscanf(value, "%d", &parsed); err != nil || parsed <= 0 {
		return fallback
	}

	return parsed
}

// wikiServer is defined here so all files in 'package main' can see it.
// Its methods (the gRPC handlers) will live in handlers.go
type wikiServer struct {
	pb.UnimplementedWikiServiceServer
	db *sqlx.DB
}

func main() {
	startedAt := time.Now()
	loadEnvFile("/vault/secrets/.env")
	flag.Parse()

	_ = &pb.Node{}

	dbURL := os.Getenv("DATABASE_URL") + "?sslmode=disable"
	db, err := sqlx.Connect("postgres", dbURL)
	if err != nil {
		log.Fatalf("Could not connect to database: %v", err)
	}
	defer db.Close()

	// Configure connection pooling (keeps the DB healthy under load)
	db.SetMaxOpenConns(intEnv("WIKI_DB_MAX_OPEN_CONNS", 10))
	db.SetMaxIdleConns(intEnv("WIKI_DB_MAX_IDLE_CONNS", 10))
	db.SetConnMaxLifetime(time.Duration(intEnv("WIKI_DB_CONN_MAX_LIFETIME_SECS", 300)) * time.Second)

	log.Println("Database connection established")
	startMetricsServer("wiki", startedAt)

	// Run Migrations
	if err := runMigrations(db); err != nil {
		log.Fatalf("Could not run migrations: %v", err)
	}

	// 2. Setup the Network Listener
	port := getPort()
	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", port))
	if err != nil {
		log.Fatalf("Failed to listen on port %d: %v", port, err)
	}

	// 3. Initialize the gRPC Server
	s := grpc.NewServer()

	// Register the service using our server struct that holds the DB
	serverInstance := &wikiServer{db: db}
	pb.RegisterWikiServiceServer(s, serverInstance)

	// Enable reflection so tools like Postman can see your methods
	reflection.Register(s)

	// 4. Start the server in a goroutine
	go func() {
		log.Printf("Wiki Service is live at localhost:%d", port)
		if err := s.Serve(lis); err != nil {
			log.Fatalf("Failed to serve: %v", err)
		}
	}()

	// 5. Graceful Shutdown (The "Clean Exit")
	// This waits for you to hit Ctrl+C (SIGINT) or for the system to stop the app (SIGTERM)
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	log.Println("\nStopping server...")
	s.GracefulStop()
	log.Println("Server stopped gracefully.")
}

func runMigrations(db *sqlx.DB) error {
	driver, err := postgres.WithInstance(db.DB, &postgres.Config{})
	if err != nil {
		return fmt.Errorf("could not create driver: %w", err)
	}

	d, err := iofs.New(migrationsFS, "migrations")
	if err != nil {
		return fmt.Errorf("could not create iofs source: %w", err)
	}

	m, err := migrate.NewWithInstance("iofs", d, "postgres", driver)
	if err != nil {
		return fmt.Errorf("could not create migrate instance: %w", err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("could not run up migrations: %w", err)
	}

	log.Println("Migrations applied successfully")
	return nil
}
