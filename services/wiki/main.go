package main

import (
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	r := chi.NewRouter()

	// 1. Basic Middlewares
	r.Use(middleware.Logger)    // Log every request to terminal
	r.Use(middleware.Recoverer) // Panic recovery (prevents service crash)
	r.Use(middleware.Timeout(60 * time.Second))

	// 2. Routes
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Wiki Service API v1.0 (Powered by Chi)"))
	})

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	r.Get("/ready", func(w http.ResponseWriter, r *http.Request) {
		// Placeholder for future DB checks
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("READY"))
	})

	// Example of a grouped route for the wiki content
	r.Route("/articles", func(r chi.Router) {
		r.Get("/", listArticles) // GET /articles
	})

	fmt.Printf("🚀 Wiki Service listening on port %s\n", port)
	http.ListenAndServe(":"+port, r)
}

func listArticles(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Article list placeholder"))
}
