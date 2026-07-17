package internal

import (
	"log/slog"
	"os"
)

func GetJSONLogger() *slog.Logger {
	return slog.New(slog.NewJSONHandler(os.Stdout, nil))
}

func GetDefaultLogger() *slog.Logger {
	return GetJSONLogger()
}
