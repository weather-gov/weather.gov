package internal

import (
	"log/slog"
	"os"
)

func GetJSONLogger(task string) *slog.Logger {
	return slog.New(slog.NewJSONHandler(os.Stdout, nil)).With("task", task)
}
