package main

import (
	"flag"
	"fmt"
	"log"
	"net"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq" // PostgreSQL driver
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	pb "wiki/proto/wiki/v1"
)

var (
	bypass_moderation = flag.Bool("bypass", false, "bypass moderation")
	port              = flag.Int("port", 50051, "The port to serve gRPC on")
	// Update these credentials to match your local Postgres setup
	dbURL = flag.String("db", "postgres://postgres:password@localhost:5432/wiki?sslmode=disable", "PostgreSQL connection string")
)

// wikiServer is defined here so all files in 'package main' can see it.
// Its methods (the gRPC handlers) will live in handlers.go
type wikiServer struct {
	pb.UnimplementedWikiServiceServer
	db *sqlx.DB
}

func main() {
	flag.Parse()

	_ = &pb.Node{}

	db, err := sqlx.Connect("postgres", *dbURL)
	if err != nil {
		log.Fatalf("Could not connect to database: %v", err)
	}
	defer db.Close()

	// Configure connection pooling (keeps the DB healthy under load)
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)

	log.Println("Database connection established")

	// 2. Setup the Network Listener
	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", *port))
	if err != nil {
		log.Fatalf("Failed to listen on port %d: %v", *port, err)
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
		log.Printf("Wiki Service is live at localhost:%d", *port)
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
