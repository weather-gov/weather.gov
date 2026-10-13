import isObservationValid from "./valid.js";

// PQW/PQE gridpoint stations lookups 500, so these grids use the station list below
export const PACIFIC_STATION_WFOS = ["PQW", "PQE"];

// Same shape as an API station feature, elevation in meters
const station = (stationIdentifier, coordinates, name, elevation) => ({
  geometry: { type: "Point", coordinates },
  properties: {
    stationIdentifier,
    name,
    elevation: { unitCode: "wmoUnit:m", value: elevation },
  },
});

// PW/FM/MH stations that report temperature, metadata from /stations/{id}
export const PACIFIC_STATIONS = [
  station("PTRO", [134.5443, 7.3673], "Palau International Airport", 53.9496),
  station("PTYA", [138.0833, 9.4833], "Yap Island - Yap Int. Airport", 17.0688),
  station("PTKK", [151.843, 7.4619], "Weno Island - Chuuk Int. Airport", 3.048),
  station("PTPN", [158.21013, 6.98579], "Pohnpei Island", 2.7432),
  station("PTTP", [158.2167, 6.9667], "Pohnpei - NWS Office", 39.0144),
  station("PTSA", [162.9557, 5.3524], "Kosrae Island - Kosrae Airport", 3.3528),
  station(
    "PKMJ",
    [171.2699, 7.0643],
    "Majuro Atoll - Marshall Islands Int. Airport",
    1.8288,
  ),
  station("PKMR", [171.3908, 7.0864], "Majuro Atoll - NWS Office", 3.048),
];

// These stations often report a null temperature, 50 obs covers ~2 days
export const PACIFIC_STATION_OBSERVATIONS = Object.freeze({
  limit: 50,
  // 12 hours
  maxAge: 12 * 60 * 60 * 1000,
});

// 80 km
export const PACIFIC_STATION_MAX_DISTANCE = 80000;

// 3 nearest stations inside the distance cap, same shape as the gridpoints list
export const fetchNearestStations = async ({ latitude, longitude }, db) => {
  const { rows } = await db.query(
    `SELECT idx
      FROM unnest($1::text[]) WITH ORDINALITY AS s(geometry, idx)
      CROSS JOIN LATERAL (
        SELECT ST_DISTANCESPHERE(
          ST_GEOMFROMGEOJSON(geometry),
          ST_GEOMFROMTEXT('POINT(${longitude} ${latitude})')
        ) AS distance
      ) d
      WHERE distance <= $2
      ORDER BY distance
      LIMIT 3`,
    [
      PACIFIC_STATIONS.map(({ geometry }) => JSON.stringify(geometry)),
      PACIFIC_STATION_MAX_DISTANCE,
    ],
  );

  return rows.length
    ? rows.map(({ idx }) => PACIFIC_STATIONS[idx - 1])
    : { error: true };
};

// API lists observations newest first, so this is the newest with a temperature inside maxAge
export const newestValidObservation = (features, maxAge) =>
  features
    .map(({ properties }) => properties)
    .find(
      (obs) =>
        isObservationValid(obs) &&
        Date.now() - new Date(obs.timestamp) <= maxAge,
    );
