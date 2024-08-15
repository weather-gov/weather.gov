const ALERT_KIND = {
  LAND: "land",
  MARINE: "marine",
  OTHER: "other",
};

const ALERT_LEVEL = {
  WARNING: {
    priority: 0,
    text: "warning",
  },

  WATCH: {
    priority: 128,
    text: "watch",
  },

  OTHER: {
    priority: 2048,
    text: "other",
  },
};

export default new Map([
  // Priorities are spaced at intervals of powers of two so that new
  // alerts can be inserted exactly in the middle of any existing alerts
  // without needing to reorder all of the other alerts.
  [
    "tsunami warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 0,
    },
  ],
  [
    "tornado warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 1024,
    },
  ],
  [
    "extreme wind warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 2048,
    },
  ],
  [
    "severe thunderstorm warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 3072,
    },
  ],
  [
    "flash flood warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 4096,
    },
  ],
  [
    "flash flood statement",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 5120,
    },
  ],
  [
    "severe weather statement",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 6144,
    },
  ],
  [
    "shelter in place warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 7168,
    },
  ],
  [
    "evacuation immediate",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 8192,
    },
  ],
  [
    "civil danger warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 9216,
    },
  ],
  [
    "nuclear power plant warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 10240,
    },
  ],
  [
    "radiological hazard warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 11264,
    },
  ],
  [
    "hazardous materials warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 12288,
    },
  ],
  [
    "fire warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 13312,
    },
  ],
  [
    "civil emergency message",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 14336,
    },
  ],
  [
    "law enforcement warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 15360,
    },
  ],
  [
    "storm surge warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.MARINE,
      priority: 16384,
    },
  ],
  [
    "hurricane force wind warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.MARINE,
      priority: 17408,
    },
  ],
  [
    "hurricane warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 18432,
    },
  ],
  [
    "typhoon warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 19456,
    },
  ],
  [
    "special marine warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.MARINE,
      priority: 20480,
    },
  ],
  [
    "blizzard warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 21504,
    },
  ],
  [
    "snow squall warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 22528,
    },
  ],
  [
    "ice storm warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 23552,
    },
  ],
  [
    "winter storm warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 24576,
    },
  ],
  [
    "high wind warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 25600,
    },
  ],
  [
    "tropical storm warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 26624,
    },
  ],
  [
    "storm warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.MARINE,
      priority: 27648,
    },
  ],
  [
    "tsunami advisory",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 28672,
    },
  ],
  [
    "tsunami watch",
    {
      level: ALERT_LEVEL.WATCH,
      kind: ALERT_KIND.LAND,
      priority: 29696,
    },
  ],
  [
    "avalanche warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 30720,
    },
  ],
  [
    "earthquake warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 31744,
    },
  ],
  [
    "volcano warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 32768,
    },
  ],
  [
    "ashfall warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 33792,
    },
  ],
  [
    "coastal flood warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 34816,
    },
  ],
  [
    "lakeshore flood warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 35840,
    },
  ],
  [
    "flood warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 36864,
    },
  ],
  [
    "high surf warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 37888,
    },
  ],
  [
    "dust storm warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 38912,
    },
  ],
  [
    "blowing dust warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.OTHER,
      priority: 39936,
    },
  ],
  [
    "lake effect snow warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 40960,
    },
  ],
  [
    "excessive heat warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 41984,
    },
  ],
  [
    "tornado watch",
    {
      level: ALERT_LEVEL.WATCH,
      kind: ALERT_KIND.LAND,
      priority: 43008,
    },
  ],
  [
    "severe thunderstorm watch",
    {
      level: ALERT_LEVEL.WATCH,
      kind: ALERT_KIND.LAND,
      priority: 44032,
    },
  ],
  [
    "flash flood watch",
    {
      level: ALERT_LEVEL.WATCH,
      kind: ALERT_KIND.LAND,
      priority: 45056,
    },
  ],
  [
    "gale warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.MARINE,
      priority: 46080,
    },
  ],
  [
    "flood statement",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 47104,
    },
  ],
  [
    "wind chill warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 48128,
    },
  ],
  [
    "extreme cold warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 49152,
    },
  ],
  [
    "hard freeze warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 50176,
    },
  ],
  [
    "freeze warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 51200,
    },
  ],
  [
    "red flag warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.LAND,
      priority: 52224,
    },
  ],
  [
    "storm surge watch",
    {
      level: ALERT_LEVEL.WATCH,
      kind: ALERT_KIND.MARINE,
      priority: 53248,
    },
  ],
  [
    "hurricane watch",
    {
      level: ALERT_LEVEL.WATCH,
      kind: ALERT_KIND.LAND,
      priority: 54272,
    },
  ],
  [
    "hurricane force wind watch",
    {
      level: ALERT_LEVEL.WATCH,
      kind: ALERT_KIND.MARINE,
      priority: 55296,
    },
  ],
  [
    "typhoon watch",
    {
      level: ALERT_LEVEL.WATCH,
      kind: ALERT_KIND.LAND,
      priority: 56320,
    },
  ],
  [
    "tropical storm watch",
    {
      level: ALERT_LEVEL.WATCH,
      kind: ALERT_KIND.LAND,
      priority: 57344,
    },
  ],
  [
    "storm watch",
    {
      level: ALERT_LEVEL.WATCH,
      kind: ALERT_KIND.MARINE,
      priority: 58368,
    },
  ],
  [
    "hurricane local statement",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 59392,
    },
  ],
  [
    "typhoon local statement",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 60416,
    },
  ],
  [
    "tropical storm local statement",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 61440,
    },
  ],
  [
    "tropical depression local statement",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 62464,
    },
  ],
  [
    "avalanche advisory",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 63488,
    },
  ],
  [
    "winter weather advisory",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 64512,
    },
  ],
  [
    "wind chill advisory",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 65536,
    },
  ],
  [
    "heat advisory",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 66560,
    },
  ],
  [
    "urban and small stream flood advisory",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 67584,
    },
  ],
  [
    "small stream flood advisory",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 68608,
    },
  ],
  [
    "arroyo and small stream flood advisory",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 69632,
    },
  ],
  [
    "flood advisory",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 70656,
    },
  ],
  [
    "hydrologic advisory",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 71680,
    },
  ],
  [
    "lakeshore flood advisory",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 72704,
    },
  ],
  [
    "coastal flood advisory",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 73728,
    },
  ],
  [
    "high surf advisory",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 74752,
    },
  ],
  [
    "heavy freezing spray warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.MARINE,
      priority: 75776,
    },
  ],
  [
    "dense fog advisory",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 76800,
    },
  ],
  [
    "dense smoke advisory",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 77824,
    },
  ],
  [
    "small craft advisory",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.MARINE,
      priority: 78848,
    },
  ],
  [
    "brisk wind advisory",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.MARINE,
      priority: 79872,
    },
  ],
  [
    "hazardous seas warning",
    {
      level: ALERT_LEVEL.WARNING,
      kind: ALERT_KIND.MARINE,
      priority: 80896,
    },
  ],
  [
    "dust advisory",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.OTHER,
      priority: 81920,
    },
  ],
  [
    "blowing dust advisory",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 82944,
    },
  ],
  [
    "lake wind advisory",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 83968,
    },
  ],
  [
    "wind advisory",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 84992,
    },
  ],
  [
    "frost advisory",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 86016,
    },
  ],
  [
    "ashfall advisory",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 87040,
    },
  ],
  [
    "freezing fog advisory",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 88064,
    },
  ],
  [
    "freezing spray advisory",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.MARINE,
      priority: 89088,
    },
  ],
  [
    "low water advisory",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.MARINE,
      priority: 90112,
    },
  ],
  [
    "local area emergency",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 91136,
    },
  ],
  [
    "avalanche watch",
    {
      level: ALERT_LEVEL.WATCH,
      kind: ALERT_KIND.LAND,
      priority: 92160,
    },
  ],
  [
    "blizzard watch",
    {
      level: ALERT_LEVEL.WATCH,
      kind: ALERT_KIND.LAND,
      priority: 93184,
    },
  ],
  [
    "rip current statement",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 94208,
    },
  ],
  [
    "beach hazards statement",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 95232,
    },
  ],
  [
    "gale watch",
    {
      level: ALERT_LEVEL.WATCH,
      kind: ALERT_KIND.MARINE,
      priority: 96256,
    },
  ],
  [
    "winter storm watch",
    {
      level: ALERT_LEVEL.WATCH,
      kind: ALERT_KIND.LAND,
      priority: 97280,
    },
  ],
  [
    "hazardous seas watch",
    {
      level: ALERT_LEVEL.WATCH,
      kind: ALERT_KIND.MARINE,
      priority: 98304,
    },
  ],
  [
    "heavy freezing spray watch",
    {
      level: ALERT_LEVEL.WATCH,
      kind: ALERT_KIND.MARINE,
      priority: 99328,
    },
  ],
  [
    "coastal flood watch",
    {
      level: ALERT_LEVEL.WATCH,
      kind: ALERT_KIND.LAND,
      priority: 100352,
    },
  ],
  [
    "lakeshore flood watch",
    {
      level: ALERT_LEVEL.WATCH,
      kind: ALERT_KIND.LAND,
      priority: 101376,
    },
  ],
  [
    "flood watch",
    {
      level: ALERT_LEVEL.WATCH,
      kind: ALERT_KIND.LAND,
      priority: 102400,
    },
  ],
  [
    "high wind watch",
    {
      level: ALERT_LEVEL.WATCH,
      kind: ALERT_KIND.LAND,
      priority: 103424,
    },
  ],
  [
    "excessive heat watch",
    {
      level: ALERT_LEVEL.WATCH,
      kind: ALERT_KIND.LAND,
      priority: 104448,
    },
  ],
  [
    "extreme cold watch",
    {
      level: ALERT_LEVEL.WATCH,
      kind: ALERT_KIND.LAND,
      priority: 105472,
    },
  ],
  [
    "wind chill watch",
    {
      level: ALERT_LEVEL.WATCH,
      kind: ALERT_KIND.LAND,
      priority: 106496,
    },
  ],
  [
    "lake effect snow watch",
    {
      level: ALERT_LEVEL.WATCH,
      kind: ALERT_KIND.LAND,
      priority: 107520,
    },
  ],
  [
    "hard freeze watch",
    {
      level: ALERT_LEVEL.WATCH,
      kind: ALERT_KIND.MARINE,
      priority: 108544,
    },
  ],
  [
    "freeze watch",
    {
      level: ALERT_LEVEL.WATCH,
      kind: ALERT_KIND.LAND,
      priority: 109568,
    },
  ],
  [
    "fire weather watch",
    {
      level: ALERT_LEVEL.WATCH,
      kind: ALERT_KIND.LAND,
      priority: 110592,
    },
  ],
  [
    "extreme fire danger",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 111616,
    },
  ],
  [
    "911 telephone outage",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 112640,
    },
  ],
  [
    "coastal flood statement",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 113664,
    },
  ],
  [
    "lakeshore flood statement",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 114688,
    },
  ],
  [
    "special weather statement",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 115712,
    },
  ],
  [
    "marine weather statement",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.MARINE,
      priority: 116736,
    },
  ],
  [
    "air quality alert",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 117760,
    },
  ],
  [
    "air stagnation advisory",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 118784,
    },
  ],
  [
    "hazardous weather outlook",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 119808,
    },
  ],
  [
    "hydrologic outlook",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 120832,
    },
  ],
  [
    "short term forecast",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 121856,
    },
  ],
  [
    "administrative message",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 122880,
    },
  ],
  [
    "test",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 123904,
    },
  ],
  [
    "child abduction emergency",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.LAND,
      priority: 124928,
    },
  ],
  [
    "blue alert",
    {
      level: ALERT_LEVEL.OTHER,
      kind: ALERT_KIND.OTHER,
      priority: 125952,
    },
  ],
]);
