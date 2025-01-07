package events

import "strings"

type AlertType struct {
	Level string
	Kind string
	Priority int
}

var AlertTypes = map[string]AlertType{
	"tsunami warning": AlertType{
		"warning", "land", 0,
	},
	"tornado warning": AlertType{
		"warning", "land", 1024,
	},
	"extreme wind warning": AlertType{
		"warning", "land", 2048,
	},
	"severe thunderstorm warning": AlertType{
		"warning", "land", 3072,
	},
	"flash flood warning": AlertType{
		"warning", "land", 4096,
	},
	"flash flood statement": AlertType{
		"other", "land", 5120,
	},
	"severe weather statement": AlertType{
		"other", "land", 6144,
	},
	"shelter in place warning": AlertType{
		"warning", "land", 7168,
	},
	"evacuation immediate": AlertType{
		"other", "land", 8192,
	},
	"civil danger warning": AlertType{
		"warning", "land", 9216,
	},
	"nuclear power plant warning": AlertType{
		"warning", "land", 10240,
	},
	"radiological hazard warning": AlertType{
		"warning", "land", 11264,
	},
	"hazardous materials warning": AlertType{
		"warning", "land", 12288,
	},
	"fire warning": AlertType{
		"warning", "land", 13312,
	},
	"civil emergency message": AlertType{
		"other", "land", 14336,
	},
	"law enforcement warning": AlertType{
		"warning", "land", 15360,
	},
	"storm surge warning": AlertType{
		"warning", "marine", 16384,
	},
	"hurricane force wind warning": AlertType{
		"warning", "marine", 17408,
	},
	"hurricane warning": AlertType{
		"warning", "land", 18432,
	},
	"typhoon warning": AlertType{
		"warning", "land", 19456,
	},
	"special marine warning": AlertType{
		"warning", "marine", 20480,
	},
	"blizzard warning": AlertType{
		"warning", "land", 21504,
	},
	"snow squall warning": AlertType{
		"warning", "land", 22528,
	},
	"ice storm warning": AlertType{
		"warning", "land", 23552,
	},
	"heavy freezing spray warning": AlertType{
		"warning", "marine", 24576,
	},
	"winter storm warning": AlertType{
		"warning", "land", 25600,
	},
	"lake effect snow warning": AlertType{
		"warning", "land", 26624,
	},
	"dust storm warning": AlertType{
		"warning", "land", 27648,
	},
	"blowing dust warning": AlertType{
		"warning", "other", 28672,
	},
	"high wind warning": AlertType{
		"warning", "land", 29696,
	},
	"tropical storm warning": AlertType{
		"warning", "land", 30720,
	},
	"storm warning": AlertType{
		"warning", "marine", 31744,
	},
	"tsunami advisory": AlertType{
		"other", "land", 32768,
	},
	"tsunami watch": AlertType{
		"watch", "land", 33792,
	},
	"avalanche warning": AlertType{
		"warning", "land", 34816,
	},
	"earthquake warning": AlertType{
		"warning", "land", 35840,
	},
	"volcano warning": AlertType{
		"warning", "land", 36864,
	},
	"ashfall warning": AlertType{
		"warning", "land", 37888,
	},
	"flood warning": AlertType{
		"warning", "land", 38912,
	},
	"coastal flood warning": AlertType{
		"warning", "land", 39936,
	},
	"lakeshore flood warning": AlertType{
		"warning", "land", 40960,
	},
	"ashfall advisory": AlertType{
		"other", "land", 41984,
	},
	"high surf warning": AlertType{
		"warning", "land", 43008,
	},
	"excessive heat warning": AlertType{
		"warning", "land", 44032,
	},
	"tornado watch": AlertType{
		"watch", "land", 45056,
	},
	"severe thunderstorm watch": AlertType{
		"watch", "land", 46080,
	},
	"flash flood watch": AlertType{
		"watch", "land", 47104,
	},
	"gale warning": AlertType{
		"warning", "marine", 48128,
	},
	"flood statement": AlertType{
		"other", "land", 49152,
	},
	"extreme cold warning": AlertType{
		"warning", "land", 50176,
	},
	"freeze warning": AlertType{
		"warning", "land", 51200,
	},
	"red flag warning": AlertType{
		"warning", "land", 52224,
	},
	"storm surge watch": AlertType{
		"watch", "marine", 53248,
	},
	"hurricane watch": AlertType{
		"watch", "land", 54272,
	},
	"hurricane force wind watch": AlertType{
		"watch", "marine", 55296,
	},
	"typhoon watch": AlertType{
		"watch", "land", 56320,
	},
	"tropical storm watch": AlertType{
		"watch", "land", 57344,
	},
	"storm watch": AlertType{
		"watch", "marine", 58368,
	},
	"tropical cyclone local statement": AlertType{
		"other", "land", 59392,
	},
	"winter weather advisory": AlertType{
		"other", "land", 60416,
	},
	"avalanche advisory": AlertType{
		"other", "land", 61440,
	},
	"cold weather advisory": AlertType{
		"other", "land", 62464,
	},
	"heat advisory": AlertType{
		"other", "land", 63488,
	},
	"flood advisory": AlertType{
		"other", "land", 64512,
	},
	"coastal flood advisory": AlertType{
		"other", "land", 65536,
	},
	"lakeshore flood advisory": AlertType{
		"other", "land", 66560,
	},
	"high surf advisory": AlertType{
		"other", "land", 67584,
	},
	"dense fog advisory": AlertType{
		"other", "land", 68608,
	},
	"dense smoke advisory": AlertType{
		"other", "land", 69632,
	},
	"small craft advisory": AlertType{
		"other", "marine", 70656,
	},
	"brisk wind advisory": AlertType{
		"other", "marine", 71680,
	},
	"hazardous seas warning": AlertType{
		"warning", "marine", 72704,
	},
	"dust advisory": AlertType{
		"other", "other", 73728,
	},
	"blowing dust advisory": AlertType{
		"other", "land", 74752,
	},
	"lake wind advisory": AlertType{
		"other", "land", 75776,
	},
	"wind advisory": AlertType{
		"other", "land", 76800,
	},
	"frost advisory": AlertType{
		"other", "land", 77824,
	},
	"freezing fog advisory": AlertType{
		"other", "land", 78848,
	},
	"freezing spray advisory": AlertType{
		"other", "marine", 79872,
	},
	"low water advisory": AlertType{
		"other", "marine", 80896,
	},
	"local area emergency": AlertType{
		"other", "land", 81920,
	},
	"winter storm watch": AlertType{
		"watch", "land", 82944,
	},
	"rip current statement": AlertType{
		"other", "land", 83968,
	},
	"beach hazards statement": AlertType{
		"other", "land", 84992,
	},
	"gale watch": AlertType{
		"watch", "marine", 86016,
	},
	"avalanche watch": AlertType{
		"watch", "land", 87040,
	},
	"hazardous seas watch": AlertType{
		"watch", "marine", 88064,
	},
	"heavy freezing spray watch": AlertType{
		"watch", "marine", 89088,
	},
	"flood watch": AlertType{
		"watch", "land", 90112,
	},
	"coastal flood watch": AlertType{
		"watch", "land", 91136,
	},
	"lakeshore flood watch": AlertType{
		"watch", "land", 92160,
	},
	"high wind watch": AlertType{
		"watch", "land", 93184,
	},
	"excessive heat watch": AlertType{
		"watch", "land", 94208,
	},
	"extreme cold watch": AlertType{
		"watch", "land", 95232,
	},
	"freeze watch": AlertType{
		"watch", "land", 96256,
	},
	"fire weather watch": AlertType{
		"watch", "land", 97280,
	},
	"extreme fire danger": AlertType{
		"other", "land", 98304,
	},
	"911 telephone outage": AlertType{
		"other", "land", 99328,
	},
	"coastal flood statement": AlertType{
		"other", "land", 100352,
	},
	"lakeshore flood statement": AlertType{
		"other", "land", 101376,
	},
	"special weather statement": AlertType{
		"other", "land", 102400,
	},
	"marine weather statement": AlertType{
		"other", "marine", 103424,
	},
	"air quality alert": AlertType{
		"other", "land", 104448,
	},
	"air stagnation advisory": AlertType{
		"other", "land", 105472,
	},
	"hazardous weather outlook": AlertType{
		"other", "land", 106496,
	},
	"hydrologic outlook": AlertType{
		"other", "land", 107520,
	},
	"short term forecast": AlertType{
		"other", "land", 108544,
	},
	"administrative message": AlertType{
		"other", "land", 109568,
	},
	"test": AlertType{
		"other", "land", 110592,
	},
	"child abduction emergency": AlertType{
		"other", "land", 111616,
	},
	"blue alert": AlertType{
		"other", "other", 112640,
	},

}

func GetAlertType(name string) (AlertType, bool) {
	lowerName := strings.ToLower(name)
	result, ok := AlertTypes[lowerName]
	return result, ok
}
