package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
)

func startMetricsServer(serviceName string, startedAt time.Time) {
	addr := os.Getenv("METRICS_ADDR")
	if addr == "" {
		addr = "0.0.0.0:9091"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/metrics", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; version=0.0.4")
		startSeconds := startedAt.Unix()
		uptimeSeconds := int64(time.Since(startedAt).Seconds())
		fmt.Fprintf(w, "# HELP atfq_service_up Whether the service process is running.\n")
		fmt.Fprintf(w, "# TYPE atfq_service_up gauge\n")
		fmt.Fprintf(w, "atfq_service_up{service=%q} 1\n", serviceName)
		fmt.Fprintf(w, "# HELP atfq_service_start_time_seconds Unix timestamp when the service started.\n")
		fmt.Fprintf(w, "# TYPE atfq_service_start_time_seconds gauge\n")
		fmt.Fprintf(w, "atfq_service_start_time_seconds{service=%q} %d\n", serviceName, startSeconds)
		fmt.Fprintf(w, "# HELP atfq_service_uptime_seconds Seconds since the service started.\n")
		fmt.Fprintf(w, "# TYPE atfq_service_uptime_seconds gauge\n")
		fmt.Fprintf(w, "atfq_service_uptime_seconds{service=%q} %d\n", serviceName, uptimeSeconds)
	})

	go func() {
		log.Printf("Metrics endpoint for %s listening on %s", serviceName, addr)
		if err := http.ListenAndServe(addr, mux); err != nil {
			log.Printf("Metrics endpoint failed: %v", err)
		}
	}()
}
