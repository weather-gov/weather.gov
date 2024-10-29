import { parentPort } from "node:worker_threads";
import mariadb from "mariadb";
import {
  area,
  booleanIntersects,
  feature,
  featureCollection,
  intersect,
} from "@turf/turf";

const process = async (cwa) => {
  const db = await mariadb.createConnection({
    user: "drupal",
    password: "drupal",
    database: "weathergov",
    host: "localhost",
    port: 3306,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log(cwa.wfo);

    const counties = await db.query(
      `SELECT * FROM weathergov_geo_counties WHERE ST_INTERSECTS(shape, ST_SRID(ST_GEOMFROMGEOJSON('${JSON.stringify(cwa.shape)}'),4269))`,
    );

    const cwaCounties = counties
      .filter(({ shape }) =>
        booleanIntersects(cwa.shape, shape, {
          ignoreSelfIntersections: true,
        }),
      )
      .filter(({ shape }) => {
        const intersection = intersect(
          featureCollection([feature(shape), feature(cwa.shape)]),
        );

        return area(intersection) > area(shape) * 0.1;
      });

    parentPort.postMessage({
      wfo: cwa.wfo,
      counties: cwaCounties.map(({ state, stateName, countyName }) => ({
        state,
        stateName,
        countyName,
      })),
    });

    console.log(`${cwa.wfo}: got ${cwaCounties.length} counties`);
  } catch (e) {
    console.log(`${cwa.wfo}: This one had an error. Do it again.`);
    console.log(e);
    parentPort.postMessage({ wfo: "dead" });
  } finally {
    await db.end();
  }
};

if (parentPort) {
  parentPort.on("message", (cwa) => {
    process(cwa);
  });
}
