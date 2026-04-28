package main

import (
	"embed"
	"flag"
	"fmt"
	"log"
	"net"
	"os"
	"os/signal"
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
	// Update these credentials to match your local Postgres setup
	envURL = os.Getenv("DATABASE_URL")
	dbURL  = envURL + "?sslmode=disable"
)

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

// wikiServer is defined here so all files in 'package main' can see it.
// Its methods (the gRPC handlers) will live in handlers.go
type wikiServer struct {
	pb.UnimplementedWikiServiceServer
	db *sqlx.DB
}

func main() {
	flag.Parse()

	_ = &pb.Node{}

	db, err := sqlx.Connect("postgres", dbURL)
	if err != nil {
		log.Fatalf("Could not connect to database: %v", err)
	}
	defer db.Close()

	// Configure connection pooling (keeps the DB healthy under load)
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)

	log.Println("Database connection established")

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
