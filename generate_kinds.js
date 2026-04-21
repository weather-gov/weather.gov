import fs from 'fs';
import alertTypes from './api-interop-layer/data/alerts/kinds.js';

let goCode = `package data

type AlertType struct {
	Level    AlertLevel \`json:"level"\`
	Kind     AlertKind  \`json:"kind"\`
	Priority int        \`json:"priority"\`
}

type AlertLevel struct {
	Priority int    \`json:"priority"\`
	Text     string \`json:"text"\`
}

type AlertKind string

const (
	AlertKindLand   AlertKind = "land"
	AlertKindMarine AlertKind = "marine"
	AlertKindOther  AlertKind = "other"
)

var AlertLevelWarning = AlertLevel{Priority: 0, Text: "warning"}
var AlertLevelWatch = AlertLevel{Priority: 128, Text: "watch"}
var AlertLevelOther = AlertLevel{Priority: 2048, Text: "other"}

var AlertTypes = map[string]AlertType{
`;

function getLevelStr(level) {
  if (level.text === "warning") return "AlertLevelWarning";
  if (level.text === "watch") return "AlertLevelWatch";
  return "AlertLevelOther";
}

function getKindStr(kind) {
  if (kind === "land") return "AlertKindLand";
  if (kind === "marine") return "AlertKindMarine";
  return "AlertKindOther";
}

for (const [key, val] of alertTypes.entries()) {
  goCode += `	"${key}": {
		Level:    ${getLevelStr(val.level)},
		Kind:     ${getKindStr(val.kind)},
		Priority: ${val.priority},
	},\n`;
}

goCode += `}
`;

fs.writeFileSync('./api-interop-golang/alerts_kinds.go', goCode);
console.log("Generated alerts_kinds.go");
