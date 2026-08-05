package internal

import (
	"log/slog"
	"os"
)

func GetJSONLogger(task string) *slog.Logger {
	var level = os.Getenv("LOG_LEVEL")
	logLevel := slog.LevelInfo
	switch level {
	case "WARN":
		logLevel = slog.LevelWarn
	case "ERROR":
		logLevel = slog.LevelError
	}
	options := &slog.HandlerOptions{
		Level: logLevel,
	}
	return slog.New(slog.NewJSONHandler(os.Stdout, options)).With("task", task)
}
