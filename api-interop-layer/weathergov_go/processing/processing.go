package processing

import (
	"weathergov/alerts/fetch"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
)

func HashAlertFeature(feature *fetch.AlertFeature) string {
	stringToHash := fmt.Sprintf(
		"%s%s%s%s%s%s%s%s%s%s%s",
		feature.Properties.Id,
		feature.Properties.Event,
		feature.Properties.Sent,
		feature.Properties.Effective,
		feature.Properties.Onset,
		feature.Properties.Expires,
		feature.Properties.Ends,
		feature.Properties.Status,
		feature.Properties.Headline,
		feature.Properties.Description,
		feature.Properties.MessageType,
	)
	bytes := []byte(stringToHash)
	hasher := sha256.New()
	hasher.Write(bytes)
	return base64.StdEncoding.EncodeToString(hasher.Sum(nil))
}
