package internal

import (
	"log/slog"
	"os"
	"strings"
)

// standardize LOG_LEVEL names amongst django, interop, and tasks.
func logLevel(name string) slog.Level {
	switch strings.ToUpper(name) {
	case "TRACE", "DEBUG":
		return slog.LevelDebug
	case "WARN", "WARNING":
		return slog.LevelWarn
	case "ERROR", "CRITICAL", "FATAL":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

func GetJSONLogger(task string) *slog.Logger {
	options := &slog.HandlerOptions{
		Level: logLevel(os.Getenv("LOG_LEVEL")),
	}
	return slog.New(slog.NewJSONHandler(os.Stdout, options)).With("task", task)
}
