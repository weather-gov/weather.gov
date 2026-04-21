package data

type AlertType struct {
	Level    AlertLevel `json:"level"`
	Kind     AlertKind  `json:"kind"`
	Priority int        `json:"priority"`
}

type AlertLevel struct {
	Priority int    `json:"priority"`
	Text     string `json:"text"`
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
	"tsunami warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 0,
	},
	"tornado warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 1024,
	},
	"extreme wind warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 2048,
	},
	"severe thunderstorm warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 3072,
	},
	"flash flood warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 4096,
	},
	"flash flood statement": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 5120,
	},
	"severe weather statement": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 6144,
	},
	"shelter in place warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 7168,
	},
	"evacuation immediate": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 8192,
	},
	"civil danger warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 9216,
	},
	"nuclear power plant warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 10240,
	},
	"radiological hazard warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 11264,
	},
	"hazardous materials warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 12288,
	},
	"fire warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 13312,
	},
	"civil emergency message": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 14336,
	},
	"law enforcement warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 15360,
	},
	"storm surge warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindMarine,
		Priority: 16384,
	},
	"hurricane force wind warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindMarine,
		Priority: 17408,
	},
	"hurricane warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 18432,
	},
	"typhoon warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 19456,
	},
	"special marine warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindMarine,
		Priority: 20480,
	},
	"blizzard warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 21504,
	},
	"snow squall warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 22528,
	},
	"ice storm warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 23552,
	},
	"heavy freezing spray warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindMarine,
		Priority: 24576,
	},
	"winter storm warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 25600,
	},
	"lake effect snow warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 26624,
	},
	"dust storm warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 27648,
	},
	"blowing dust warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindOther,
		Priority: 28672,
	},
	"high wind warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 29696,
	},
	"tropical storm warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 30720,
	},
	"storm warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindMarine,
		Priority: 31744,
	},
	"tsunami advisory": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 32768,
	},
	"tsunami watch": {
		Level:    AlertLevelWatch,
		Kind:     AlertKindLand,
		Priority: 33792,
	},
	"avalanche warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 34816,
	},
	"earthquake warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 35840,
	},
	"volcano warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 36864,
	},
	"ashfall warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 37888,
	},
	"flood warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 38912,
	},
	"coastal flood warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 39936,
	},
	"lakeshore flood warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 40960,
	},
	"ashfall advisory": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 41984,
	},
	"high surf warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 43008,
	},
	"extreme heat warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 44032,
	},
	"tornado watch": {
		Level:    AlertLevelWatch,
		Kind:     AlertKindLand,
		Priority: 45056,
	},
	"severe thunderstorm watch": {
		Level:    AlertLevelWatch,
		Kind:     AlertKindLand,
		Priority: 46080,
	},
	"flash flood watch": {
		Level:    AlertLevelWatch,
		Kind:     AlertKindLand,
		Priority: 47104,
	},
	"gale warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindMarine,
		Priority: 48128,
	},
	"flood statement": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 49152,
	},
	"extreme cold warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 50176,
	},
	"freeze warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 51200,
	},
	"red flag warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindLand,
		Priority: 52224,
	},
	"storm surge watch": {
		Level:    AlertLevelWatch,
		Kind:     AlertKindMarine,
		Priority: 53248,
	},
	"hurricane watch": {
		Level:    AlertLevelWatch,
		Kind:     AlertKindLand,
		Priority: 54272,
	},
	"hurricane force wind watch": {
		Level:    AlertLevelWatch,
		Kind:     AlertKindMarine,
		Priority: 55296,
	},
	"typhoon watch": {
		Level:    AlertLevelWatch,
		Kind:     AlertKindLand,
		Priority: 56320,
	},
	"tropical storm watch": {
		Level:    AlertLevelWatch,
		Kind:     AlertKindLand,
		Priority: 57344,
	},
	"storm watch": {
		Level:    AlertLevelWatch,
		Kind:     AlertKindMarine,
		Priority: 58368,
	},
	"tropical cyclone local statement": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 59392,
	},
	"winter weather advisory": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 60416,
	},
	"avalanche advisory": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 61440,
	},
	"cold weather advisory": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 62464,
	},
	"heat advisory": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 63488,
	},
	"flood advisory": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 64512,
	},
	"coastal flood advisory": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 65536,
	},
	"lakeshore flood advisory": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 66560,
	},
	"high surf advisory": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 67584,
	},
	"dense fog advisory": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 68608,
	},
	"dense smoke advisory": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 69632,
	},
	"small craft advisory": {
		Level:    AlertLevelOther,
		Kind:     AlertKindMarine,
		Priority: 70656,
	},
	"brisk wind advisory": {
		Level:    AlertLevelOther,
		Kind:     AlertKindMarine,
		Priority: 71680,
	},
	"hazardous seas warning": {
		Level:    AlertLevelWarning,
		Kind:     AlertKindMarine,
		Priority: 72704,
	},
	"dust advisory": {
		Level:    AlertLevelOther,
		Kind:     AlertKindOther,
		Priority: 73728,
	},
	"blowing dust advisory": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 74752,
	},
	"lake wind advisory": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 75776,
	},
	"wind advisory": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 76800,
	},
	"frost advisory": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 77824,
	},
	"freezing fog advisory": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 78848,
	},
	"freezing spray advisory": {
		Level:    AlertLevelOther,
		Kind:     AlertKindMarine,
		Priority: 79872,
	},
	"low water advisory": {
		Level:    AlertLevelOther,
		Kind:     AlertKindMarine,
		Priority: 80896,
	},
	"local area emergency": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 81920,
	},
	"winter storm watch": {
		Level:    AlertLevelWatch,
		Kind:     AlertKindLand,
		Priority: 82944,
	},
	"rip current statement": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 83968,
	},
	"beach hazards statement": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 84992,
	},
	"gale watch": {
		Level:    AlertLevelWatch,
		Kind:     AlertKindMarine,
		Priority: 86016,
	},
	"avalanche watch": {
		Level:    AlertLevelWatch,
		Kind:     AlertKindLand,
		Priority: 87040,
	},
	"hazardous seas watch": {
		Level:    AlertLevelWatch,
		Kind:     AlertKindMarine,
		Priority: 88064,
	},
	"heavy freezing spray watch": {
		Level:    AlertLevelWatch,
		Kind:     AlertKindMarine,
		Priority: 89088,
	},
	"flood watch": {
		Level:    AlertLevelWatch,
		Kind:     AlertKindLand,
		Priority: 90112,
	},
	"coastal flood watch": {
		Level:    AlertLevelWatch,
		Kind:     AlertKindLand,
		Priority: 91136,
	},
	"lakeshore flood watch": {
		Level:    AlertLevelWatch,
		Kind:     AlertKindLand,
		Priority: 92160,
	},
	"high wind watch": {
		Level:    AlertLevelWatch,
		Kind:     AlertKindLand,
		Priority: 93184,
	},
	"extreme heat watch": {
		Level:    AlertLevelWatch,
		Kind:     AlertKindLand,
		Priority: 94208,
	},
	"extreme cold watch": {
		Level:    AlertLevelWatch,
		Kind:     AlertKindLand,
		Priority: 95232,
	},
	"freeze watch": {
		Level:    AlertLevelWatch,
		Kind:     AlertKindLand,
		Priority: 96256,
	},
	"fire weather watch": {
		Level:    AlertLevelWatch,
		Kind:     AlertKindLand,
		Priority: 97280,
	},
	"extreme fire danger": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 98304,
	},
	"911 telephone outage": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 99328,
	},
	"coastal flood statement": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 100352,
	},
	"lakeshore flood statement": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 101376,
	},
	"special weather statement": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 102400,
	},
	"marine weather statement": {
		Level:    AlertLevelOther,
		Kind:     AlertKindMarine,
		Priority: 103424,
	},
	"air quality alert": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 104448,
	},
	"air stagnation advisory": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 105472,
	},
	"hazardous weather outlook": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 106496,
	},
	"hydrologic outlook": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 107520,
	},
	"short term forecast": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 108544,
	},
	"administrative message": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 109568,
	},
	"test": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 110592,
	},
	"child abduction emergency": {
		Level:    AlertLevelOther,
		Kind:     AlertKindLand,
		Priority: 111616,
	},
	"blue alert": {
		Level:    AlertLevelOther,
		Kind:     AlertKindOther,
		Priority: 112640,
	},
}
