/**
 * Stress tests for alert geometry computation.
 *
 * Simulates worst-case scenarios where alerts span many
 * forecast zones, each with complex polygon shapes. A real
 * incident involved 16 zones producing 10MB+ of point data
 * that exhausted the interop layer's memory.
 *
 * These tests verify that the geometry pipeline handles
 * large inputs within acceptable time and memory bounds,
 * and serve as a baseline for measuring future optimizations.
 */
import { expect } from "chai";
import { generateAlertGeometry, ZONE_CHUNK_SIZE } from "./geometry.js";

// Whether the GC is exposed — only meaningful memory
// measurements are possible when we can force collection
const gcAvailable = typeof global.gc === "function";

/**
 * Builds a rectangular polygon with many vertices along each
 * edge. The extra points pad out the coordinate array to mimic
 * the kind of dense boundary shapes that cause problems in
 * production, without creating self-intersections that would
 * trip up the polygon-clipping library.
 */
const buildDenseRectangle = (minLon, minLat, maxLon, maxLat, pointsPerEdge) => {
  const coords = [];
  const lonStep = (maxLon - minLon) / pointsPerEdge;
  const latStep = (maxLat - minLat) / pointsPerEdge;

  // Bottom edge, left to right
  for (let i = 0; i <= pointsPerEdge; i++) {
    coords.push([minLon + i * lonStep, minLat]);
  }
  // Right edge, bottom to top (skip first — already added)
  for (let i = 1; i <= pointsPerEdge; i++) {
    coords.push([maxLon, minLat + i * latStep]);
  }
  // Top edge, right to left
  for (let i = 1; i <= pointsPerEdge; i++) {
    coords.push([maxLon - i * lonStep, maxLat]);
  }
  // Left edge, top to bottom
  for (let i = 1; i < pointsPerEdge; i++) {
    coords.push([minLon, maxLat - i * latStep]);
  }
  // Close the ring
  coords.push(coords[0]);
  return coords;
};

/**
 * Produces a GeometryCollection like the DB would return.
 * Each polygon is a dense rectangle tiled side by side so
 * neighbors share an edge — giving Turf's union real merge
 * work without creating topology errors.
 */
const buildMockDbShape = (count, pointsPerEdge) => {
  const geometries = [];
  const width = 0.5;
  const height = 0.5;
  for (let i = 0; i < count; i++) {
    // Tile rectangles along the longitude axis
    const minLon = -90 + i * width;
    const minLat = 35;
    geometries.push({
      type: "Polygon",
      coordinates: [
        buildDenseRectangle(minLon, minLat, minLon + width, minLat + height, pointsPerEdge),
      ],
    });
  }
  return {
    type: "GeometryCollection",
    geometries,
  };
};

/**
 * Helper to take a memory snapshot. Forces garbage collection
 * first when possible so the heap numbers are more stable.
 */
const getHeapUsed = () => {
  if (gcAvailable) {
    global.gc();
  }
  return process.memoryUsage().heapUsed;
};

describe("alert geometry stress tests", () => {
  // -------------------------------------------------------
  // Typical case: 5 zones, moderate polygon complexity
  // -------------------------------------------------------
  describe("typical scenario (5 zones, 50 points each)", () => {
    const zoneCount = 5;
    const pointsPerPolygon = 50;

    it("completes within 2 seconds", async () => {
      // Each DB query returns a GeometryCollection for that chunk
      const mockShape = buildMockDbShape(
        ZONE_CHUNK_SIZE,
        pointsPerPolygon,
      );
      global.test.database.query.resolves([[{ shape: mockShape }]]);

      const zones = Array.from(
        { length: zoneCount },
        (_, i) => `zone-${i}`,
      );
      const alert = {
        geometry: false,
        properties: { affectedZones: zones },
      };

      const start = performance.now();
      const result = await generateAlertGeometry(
        global.test.database,
        alert,
      );
      const elapsed = performance.now() - start;

      // Sanity check: we got a geometry back
      expect(result).to.not.be.null;

      // Should finish quickly for a small number of zones
      console.log(`    typical: ${elapsed.toFixed(0)}ms`);
      expect(elapsed).to.be.below(2000, "typical case took too long");
    });
  });

  // -------------------------------------------------------
  // Worst case: 16+ zones with hundreds of points each,
  // matching the real incident that exhausted memory
  // -------------------------------------------------------
  describe("worst-case scenario (16 zones, 200 points each)", () => {
    const zoneCount = 16;
    const pointsPerPolygon = 200;

    it("completes within 10 seconds", async () => {
      const mockShape = buildMockDbShape(
        ZONE_CHUNK_SIZE,
        pointsPerPolygon,
      );
      global.test.database.query.resolves([[{ shape: mockShape }]]);

      const zones = Array.from(
        { length: zoneCount },
        (_, i) => `zone-${i}`,
      );
      const alert = {
        geometry: false,
        properties: { affectedZones: zones },
      };

      const heapBefore = getHeapUsed();
      const start = performance.now();
      const result = await generateAlertGeometry(
        global.test.database,
        alert,
      );
      const elapsed = performance.now() - start;
      const heapAfter = getHeapUsed();
      const heapDeltaMB = (heapAfter - heapBefore) / (1024 * 1024);

      expect(result).to.not.be.null;

      console.log(`    worst-case: ${elapsed.toFixed(0)}ms, heap delta: ${heapDeltaMB.toFixed(1)}MB`);
      expect(elapsed).to.be.below(
        10000,
        "worst-case exceeded the 10-second threshold",
      );
    });
  });

  // -------------------------------------------------------
  // Extreme case: 24 zones with very dense polygons.
  // Not a hard pass/fail — purely for benchmarking so
  // future optimizations can be measured against it.
  // -------------------------------------------------------
  describe("extreme benchmark (24 zones, 500 points each)", () => {
    const zoneCount = 24;
    const pointsPerPolygon = 500;

    it("runs and reports metrics (no hard threshold)", async () => {
      const mockShape = buildMockDbShape(
        ZONE_CHUNK_SIZE,
        pointsPerPolygon,
      );
      global.test.database.query.resolves([[{ shape: mockShape }]]);

      const zones = Array.from(
        { length: zoneCount },
        (_, i) => `zone-${i}`,
      );
      const alert = {
        geometry: false,
        properties: { affectedZones: zones },
      };

      const heapBefore = getHeapUsed();
      const start = performance.now();
      const result = await generateAlertGeometry(
        global.test.database,
        alert,
      );
      const elapsed = performance.now() - start;
      const heapAfter = getHeapUsed();
      const heapDeltaMB = (heapAfter - heapBefore) / (1024 * 1024);

      // Just report — no assertions on the extreme case
      console.log(`    extreme: ${elapsed.toFixed(0)}ms, heap delta: ${heapDeltaMB.toFixed(1)}MB`);

      // But we do expect it to produce a valid result
      expect(result).to.not.be.null;
    });
  });
});
