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

const alertTypes = new Map([
  // Priorities are spaced at intervals of powers of two so that new
  // alerts can be inserted exactly in the middle of any existing alerts
  // without needing to reorder all of the other alerts.
  ["tsunami warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 0
  }],
  ["tornado warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 1024
  }],
  ["extreme wind warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 2048
  }],
  ["severe thunderstorm warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 3072
  }],
  ["flash flood warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 4096
  }],
  ["flash flood statement", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 5120
  }],
  ["severe weather statement", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 6144
  }],
  ["shelter in place warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 7168
  }],
  ["evacuation immediate", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 8192
  }],
  ["civil danger warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 9216
  }],
  ["nuclear power plant warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 10240
  }],
  ["radiological hazard warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 11264
  }],
  ["hazardous materials warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 12288
  }],
  ["fire warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 13312
  }],
  ["civil emergency message", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 14336
  }],
  ["law enforcement warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 15360
  }],
  ["storm surge warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_MARINE",
    "priority": 16384
  }],
  ["hurricane force wind warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_MARINE",
    "priority": 17408
  }],
  ["hurricane warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 18432
  }],
  ["typhoon warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 19456
  }],
  ["special marine warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_MARINE",
    "priority": 20480
  }],
  ["blizzard warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 21504
  }],
  ["snow squall warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 22528
  }],
  ["ice storm warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 23552
  }],
  ["heavy freezing spray warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_MARINE",
    "priority": 24576
  }],
  ["winter storm warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 25600
  }],
  ["lake effect snow warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 26624
  }],
  ["dust storm warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 27648
  }],
  ["blowing dust warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_OTHER",
    "priority": 28672
  }],
  ["high wind warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 29696
  }],
  ["tropical storm warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 30720
  }],
  ["storm warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_MARINE",
    "priority": 31744
  }],
  ["tsunami advisory", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 32768
  }],
  ["tsunami watch", {
    "level": "ALERT_LEVEL_WATCH",
    "kind": "ALERT_KIND_LAND",
    "priority": 33792
  }],
  ["avalanche warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 34816
  }],
  ["earthquake warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 35840
  }],
  ["volcano warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 36864
  }],
  ["ashfall warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 37888
  }],
  ["flood warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 38912
  }],
  ["coastal flood warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 39936
  }],
  ["lakeshore flood warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 40960
  }],
  ["ashfall advisory", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 41984
  }],
  ["high surf warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 43008
  }],
  ["excessive heat warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 44032
  }],
  ["tornado watch", {
    "level": "ALERT_LEVEL_WATCH",
    "kind": "ALERT_KIND_LAND",
    "priority": 45056
  }],
  ["severe thunderstorm watch", {
    "level": "ALERT_LEVEL_WATCH",
    "kind": "ALERT_KIND_LAND",
    "priority": 46080
  }],
  ["flash flood watch", {
    "level": "ALERT_LEVEL_WATCH",
    "kind": "ALERT_KIND_LAND",
    "priority": 47104
  }],
  ["gale warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_MARINE",
    "priority": 48128
  }],
  ["flood statement", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 49152
  }],
  ["extreme cold warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 50176
  }],
  ["freeze warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 51200
  }],
  ["red flag warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_LAND",
    "priority": 52224
  }],
  ["storm surge watch", {
    "level": "ALERT_LEVEL_WATCH",
    "kind": "ALERT_KIND_MARINE",
    "priority": 53248
  }],
  ["hurricane watch", {
    "level": "ALERT_LEVEL_WATCH",
    "kind": "ALERT_KIND_LAND",
    "priority": 54272
  }],
  ["hurricane force wind watch", {
    "level": "ALERT_LEVEL_WATCH",
    "kind": "ALERT_KIND_MARINE",
    "priority": 55296
  }],
  ["typhoon watch", {
    "level": "ALERT_LEVEL_WATCH",
    "kind": "ALERT_KIND_LAND",
    "priority": 56320
  }],
  ["tropical storm watch", {
    "level": "ALERT_LEVEL_WATCH",
    "kind": "ALERT_KIND_LAND",
    "priority": 57344
  }],
  ["storm watch", {
    "level": "ALERT_LEVEL_WATCH",
    "kind": "ALERT_KIND_MARINE",
    "priority": 58368
  }],
  ["tropical cyclone local statement", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 59392
  }],
  ["winter weather advisory", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 60416
  }],
  ["avalanche advisory", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 61440
  }],
  ["cold weather advisory", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 62464
  }],
  ["heat advisory", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 63488
  }],
  ["flood advisory", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 64512
  }],
  ["coastal flood advisory", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 65536
  }],
  ["lakeshore flood advisory", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 66560
  }],
  ["high surf advisory", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 67584
  }],
  ["dense fog advisory", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 68608
  }],
  ["dense smoke advisory", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 69632
  }],
  ["small craft advisory", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_MARINE",
    "priority": 70656
  }],
  ["brisk wind advisory", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_MARINE",
    "priority": 71680
  }],
  ["hazardous seas warning", {
    "level": "ALERT_LEVEL_WARNING",
    "kind": "ALERT_KIND_MARINE",
    "priority": 72704
  }],
  ["dust advisory", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_OTHER",
    "priority": 73728
  }],
  ["blowing dust advisory", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 74752
  }],
  ["lake wind advisory", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 75776
  }],
  ["wind advisory", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 76800
  }],
  ["frost advisory", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 77824
  }],
  ["freezing fog advisory", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 78848
  }],
  ["freezing spray advisory", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_MARINE",
    "priority": 79872
  }],
  ["low water advisory", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_MARINE",
    "priority": 80896
  }],
  ["local area emergency", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 81920
  }],
  ["winter storm watch", {
    "level": "ALERT_LEVEL_WATCH",
    "kind": "ALERT_KIND_LAND",
    "priority": 82944
  }],
  ["rip current statement", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 83968
  }],
  ["beach hazards statement", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 84992
  }],
  ["gale watch", {
    "level": "ALERT_LEVEL_WATCH",
    "kind": "ALERT_KIND_MARINE",
    "priority": 86016
  }],
  ["avalanche watch", {
    "level": "ALERT_LEVEL_WATCH",
    "kind": "ALERT_KIND_LAND",
    "priority": 87040
  }],
  ["hazardous seas watch", {
    "level": "ALERT_LEVEL_WATCH",
    "kind": "ALERT_KIND_MARINE",
    "priority": 88064
  }],
  ["heavy freezing spray watch", {
    "level": "ALERT_LEVEL_WATCH",
    "kind": "ALERT_KIND_MARINE",
    "priority": 89088
  }],
  ["flood watch", {
    "level": "ALERT_LEVEL_WATCH",
    "kind": "ALERT_KIND_LAND",
    "priority": 90112
  }],
  ["coastal flood watch", {
    "level": "ALERT_LEVEL_WATCH",
    "kind": "ALERT_KIND_LAND",
    "priority": 91136
  }],
  ["lakeshore flood watch", {
    "level": "ALERT_LEVEL_WATCH",
    "kind": "ALERT_KIND_LAND",
    "priority": 92160
  }],
  ["high wind watch", {
    "level": "ALERT_LEVEL_WATCH",
    "kind": "ALERT_KIND_LAND",
    "priority": 93184
  }],
  ["excessive heat watch", {
    "level": "ALERT_LEVEL_WATCH",
    "kind": "ALERT_KIND_LAND",
    "priority": 94208
  }],
  ["extreme cold watch", {
    "level": "ALERT_LEVEL_WATCH",
    "kind": "ALERT_KIND_LAND",
    "priority": 95232
  }],
  ["freeze watch", {
    "level": "ALERT_LEVEL_WATCH",
    "kind": "ALERT_KIND_LAND",
    "priority": 96256
  }],
  ["fire weather watch", {
    "level": "ALERT_LEVEL_WATCH",
    "kind": "ALERT_KIND_LAND",
    "priority": 97280
  }],
  ["extreme fire danger", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 98304
  }],
  ["911 telephone outage", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 99328
  }],
  ["coastal flood statement", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 100352
  }],
  ["lakeshore flood statement", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 101376
  }],
  ["special weather statement", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 102400
  }],
  ["marine weather statement", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_MARINE",
    "priority": 103424
  }],
  ["air quality alert", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 104448
  }],
  ["air stagnation advisory", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 105472
  }],
  ["hazardous weather outlook", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 106496
  }],
  ["hydrologic outlook", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 107520
  }],
  ["short term forecast", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 108544
  }],
  ["administrative message", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 109568
  }],
  ["test", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 110592
  }],
  ["child abduction emergency", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_LAND",
    "priority": 111616
  }],
  ["blue alert", {
    "level": "ALERT_LEVEL_OTHER",
    "kind": "ALERT_KIND_OTHER",
    "priority": 112640
  }]
]);

export default alertTypes;

export const rest = () => {
  const output = [...alertTypes.entries()]
        .sort(([, { priority: a }], [, { priority: b }]) => a - b)
        .map(([name, metadata]) => ({
          name,
          kind: metadata.kind,
        }));
  return output;
};
