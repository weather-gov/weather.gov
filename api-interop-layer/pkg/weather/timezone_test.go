package weather

import (
	"testing"
	"time"
)

func TestConvertTimezone(t *testing.T) {
	// Fixed point in time: 2023-01-01 12:00:00 UTC
	utcTime := time.Date(2023, 1, 1, 12, 0, 0, 0, time.UTC)

	tests := []struct {
		name     string
		timezone string
		wantHour int
		wantErr  bool
	}{
		{
			name:     "UTC to EST (New York)",
			timezone: "America/New_York",
			wantHour: 7, // UTC-5
			wantErr:  false,
		},
		{
			name:     "UTC to PST (Los Angeles)",
			timezone: "America/Los_Angeles",
			wantHour: 4, // UTC-8
			wantErr:  false,
		},
		{
			name:     "UTC to Tokyo",
			timezone: "Asia/Tokyo",
			wantHour: 21, // UTC+9
			wantErr:  false,
		},
		{
			name:     "Invalid Timezone",
			timezone: "Mars/Phobos",
			wantHour: 0,
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ConvertTimezone(utcTime, tt.timezone)
			if (err != nil) != tt.wantErr {
				t.Errorf("ConvertTimezone() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr {
				if got.Hour() != tt.wantHour {
					t.Errorf("ConvertTimezone() hour = %v, want %v", got.Hour(), tt.wantHour)
				}
				// Verify the location name matches
				if got.Location().String() != tt.timezone {
					t.Errorf("ConvertTimezone() location = %v, want %v", got.Location(), tt.timezone)
				}
			}
		})
	}
}

func TestConvertTimezone_Cache(t *testing.T) {
	// Verify that the cache is actually working is hard without exposing internals or mocking,
	// but we can verify it doesn't crash on repeated calls.
	timezone := "America/Chicago"
	now := time.Now()

	// First call (miss)
	_, err := ConvertTimezone(now, timezone)
	if err != nil {
		t.Fatalf("First call failed: %v", err)
	}

	// Second call (hit)
	_, err = ConvertTimezone(now, timezone)
	if err != nil {
		t.Fatalf("Second call failed: %v", err)
	}
}
