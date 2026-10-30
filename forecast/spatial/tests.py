import os
import tempfile
from io import StringIO

from django.contrib.gis.geos import Polygon
from django.core.management import call_command
from django.db import connection
from django.test import TransactionTestCase

import spatial.models as spatial

# 3x3 gridpoint blocks from the gridpoints CSV as (lon, lat, x, y)
# BOX off Martha's Vineyard, Lambert conformal
BOX_BLOCK = [
    (-71.0045166015625, 41.6449508666992, 79, 69),
    (-70.9757537841797, 41.6411094665527, 80, 69),
    (-70.9469985961914, 41.6372489929199, 81, 69),
    (-70.9993667602539, 41.6664390563965, 79, 70),
    (-70.9705963134766, 41.6625900268555, 80, 70),
    (-70.9418411254883, 41.6587409973145, 81, 70),
    (-70.9942169189453, 41.687931060791, 79, 71),
    (-70.965446472168, 41.6840782165527, 80, 71),
    (-70.9366836547852, 41.6802291870117, 81, 71),
]
# AJK Gulf of Alaska, polar stereographic
AJK_BLOCK = [
    (-137.323394775391, 56.9538497924805, 149, 99),
    (-137.276306152344, 56.9480590820312, 150, 99),
    (-137.229095458984, 56.9422416687012, 151, 99),
    (-137.312805175781, 56.9795799255371, 149, 100),
    (-137.265594482422, 56.9737815856934, 150, 100),
    (-137.218399047852, 56.9679489135742, 151, 100),
    (-137.302200317383, 57.0053100585938, 149, 101),
    (-137.254898071289, 56.9995002746582, 150, 101),
    (-137.207702636719, 56.9936714172363, 151, 101),
]
# HFO south of Oahu, Mercator
HFO_BLOCK = [
    (-157.984100341797, 20.286979675293, 149, 99),
    (-157.960098266602, 20.286979675293, 150, 99),
    (-157.93620300293, 20.286979675293, 151, 99),
    (-157.984100341797, 20.309419631958, 149, 100),
    (-157.960098266602, 20.309419631958, 150, 100),
    (-157.93620300293, 20.309419631958, 151, 100),
    (-157.984100341797, 20.331859588623, 149, 101),
    (-157.960098266602, 20.331859588623, 150, 101),
    (-157.93620300293, 20.331859588623, 151, 101),
]
# PQE off Pohnpei, Mercator east of 0 longitude
PQE_BLOCK = [
    (158.188003540039, 6.95139122009277, 96, 146),
    (158.235900878906, 6.95139122009277, 97, 146),
    (158.283706665039, 6.95139122009277, 98, 146),
    (158.188003540039, 6.99891710281372, 96, 147),
    (158.235900878906, 6.99891710281372, 97, 147),
    (158.283706665039, 6.99891710281372, 98, 147),
    (158.188003540039, 7.04643821716309, 96, 148),
    (158.235900878906, 7.04643821716309, 97, 148),
    (158.283706665039, 7.04643821716309, 98, 148),
]
# ALU Bering Sea across ±180, polar stereographic
ALU_BLOCK = [
    (179.99169921875, 54.0546989440918, 213, 199),
    (-179.970001220703, 54.0676803588867, 214, 199),
    (-179.931701660156, 54.080638885498, 215, 199),
    (179.969497680664, 54.0771789550781, 213, 200),
    (-179.992095947266, 54.090160369873, 214, 200),
    (-179.953796386719, 54.1031303405762, 215, 200),
    (179.947402954102, 54.0996513366699, 213, 201),
    (179.985702514648, 54.1126518249512, 214, 201),
    (-179.97590637207, 54.1256294250488, 215, 201),
]

# Far ends of each CWA so the lattice fit spans the whole grid
CORNERS = {
    "BOX": [
        (-72.9543533325195, 41.5404205322266, 14, 53),
        (-69.3173065185547, 40.3392791748047, 147, 21),
        (-73.0702896118164, 42.7677307128906, 1, 108),
        (-69.1716537475586, 42.98583984375, 129, 141),
    ],
    "AJK": [
        (-144.111892700195, 55.0450897216797, 18, 4),
        (-130.681304931641, 54.6533508300781, 310, 54),
        (-143.266998291016, 60.5629386901855, 12, 213),
        (-129.999801635742, 56.1256904602051, 305, 112),
    ],
    "HFO": [
        (-161.524993896484, 18.072660446167, 1, 1),
        (-153.868896484375, 18.072660446167, 321, 1),
        (-161.524993896484, 23.0877704620361, 1, 225),
        (-153.868896484375, 23.0877704620361, 321, 225),
    ],
    "PQE": [
        (153.641799926758, 0.02589526027441, 1, 1),
        (179.578994750977, 0.02589526027441, 543, 1),
        (153.641799926758, 14.2409896850586, 1, 301),
        (179.578994750977, 14.2409896850586, 543, 301),
    ],
    "ALU": [
        (176.732192993164, 50.6228408813477, 77, 126),
        (-152.990493774414, 55.3569793701172, 796, 77),
        (170.8125, 52.8951301574707, 14, 282),
        (-151.720596313477, 62.8233108520508, 832, 356),
    ],
}

NEITHER = (False, False)
MARINE = (True, False)
LAND = (False, True)
BOTH = (True, True)


def toward(block, center, neighbor, fraction):
    """Interpolate lon/lat from one gridpoint toward another."""
    points = {(x, y): (lon, lat) for lon, lat, x, y in block}
    (lon0, lat0), (lon1, lat1) = points[center], points[neighbor]
    return (lon0 + (lon1 - lon0) * fraction, lat0 + (lat1 - lat0) * fraction)


# VACUUM can't run inside TestCase's transaction
class TestLoadGridpoints(TransactionTestCase):
    """Tests the loadgridpoints land and marine flags."""

    def setUp(self):
        """Test setup."""
        for cwa in ("BOX", "AJK", "HFO", "PQE"):
            spatial.WeatherCountyWarningAreas.objects.create(cwa=cwa, wfo=cwa, shape=Polygon.from_bbox((0, 0, 1, 1)))

    def add_zone(self, zone_type, lon, lat, size=0.0001):
        """Add a small square zone centered on lon/lat."""
        half = size / 2
        spatial.WeatherZone.objects.create(
            id=f"{zone_type}-{spatial.WeatherZone.objects.count()}",
            type=zone_type,
            shape=Polygon.from_bbox((lon - half, lat - half, lon + half, lat + half)),
        )

    def load(self, cwa, block):
        """Run loadgridpoints and return (is_marine, is_land) keyed by (x, y)."""
        # The command leaves temp_grid behind on this connection
        with connection.cursor() as cursor:
            cursor.execute("DROP TABLE IF EXISTS temp_grid, temp_zones, temp_lattices, temp_cells;")

        with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False) as csvfile:
            csvfile.write("X,Y,cwa,x,y\n")
            for lon, lat, x, y in block + CORNERS[cwa]:
                csvfile.write(f"{lon},{lat},{cwa.lower()},{x},{y}\n")
        self.addCleanup(os.remove, csvfile.name)

        call_command("loadgridpoints", csvfile.name, stdout=StringIO())
        return {(g.x, g.y): (g.is_marine, g.is_land) for g in spatial.WeatherGridPoints.objects.filter(cwa=cwa)}

    def test_zone_types(self):
        """Test that each zone type sets the right flag."""
        for zone_type, expected in (
            ("marine:coastal", MARINE),
            ("marine:offshore", MARINE),
            ("forecast", LAND),
            ("fire", NEITHER),
            ("public", NEITHER),
        ):
            with self.subTest(zone_type=zone_type):
                spatial.WeatherZone.objects.all().delete()
                self.add_zone(zone_type, -70.9705963134766, 41.6625900268555)
                flags = self.load("BOX", BOX_BLOCK)
                self.assertEqual(flags[(80, 70)], expected)
                self.assertEqual(flags[(79, 70)], NEITHER)

    def test_coastline(self):
        """Test that a cell with land and water is both."""
        self.add_zone("forecast", *toward(BOX_BLOCK, (80, 70), (79, 70), 0.4))
        self.add_zone("marine:coastal", *toward(BOX_BLOCK, (80, 70), (81, 70), 0.4))
        flags = self.load("BOX", BOX_BLOCK)
        self.assertEqual(flags[(80, 70)], BOTH)
        self.assertEqual(flags[(79, 70)], NEITHER)
        self.assertEqual(flags[(81, 70)], NEITHER)

    def test_neither(self):
        """Test that a cell with no zones is neither."""
        self.add_zone("forecast", -100, 40)
        self.add_zone("marine:offshore", -60, 40)
        flags = self.load("BOX", BOX_BLOCK)
        self.assertEqual(set(flags.values()), {NEITHER})

    def test_island(self):
        """Test that an island smaller than a cell still makes it land."""
        self.add_zone("marine:coastal", 158.236, 7.0, size=0.2)
        self.add_zone("forecast", *toward(PQE_BLOCK, (97, 147), (98, 148), 0.3), size=0.002)
        flags = self.load("PQE", PQE_BLOCK)
        self.assertEqual(flags[(97, 147)], BOTH)
        self.assertEqual(flags[(96, 147)], MARINE)
        self.assertEqual(flags[(98, 148)], MARINE)

    def test_corners_in_own_cell(self):
        """Test that gridpoints at the far ends of each CWA fall in their own cell."""
        for cwa, block in (
            ("BOX", BOX_BLOCK),
            ("AJK", AJK_BLOCK),
            ("HFO", HFO_BLOCK),
            ("PQE", PQE_BLOCK),
            ("ALU", ALU_BLOCK),
        ):
            with self.subTest(cwa=cwa):
                spatial.WeatherZone.objects.all().delete()
                for lon, lat, _, _ in CORNERS[cwa]:
                    self.add_zone("forecast", lon, lat)
                flags = self.load(cwa, block)
                land = {k for k, v in flags.items() if v == LAND}
                corners = {(x, y) for _, _, x, y in CORNERS[cwa]}
                self.assertEqual(land, corners)

    def test_cell_edges(self):
        """Test that each projection's cell reaches halfway to its neighbors."""
        for cwa, block, center in (
            ("BOX", BOX_BLOCK, (80, 70)),
            ("AJK", AJK_BLOCK, (150, 100)),
            ("HFO", HFO_BLOCK, (150, 100)),
            ("PQE", PQE_BLOCK, (97, 147)),
        ):
            cx, cy = center
            east, north, northeast = (cx + 1, cy), (cx, cy + 1), (cx + 1, cy + 1)
            # Corner probes catch a cell rotated off the grid
            for neighbor, fraction, expected in (
                (east, 0.4, center),
                (east, 0.6, east),
                (north, 0.4, center),
                (north, 0.6, north),
                (northeast, 0.45, center),
                (northeast, 0.55, northeast),
            ):
                with self.subTest(cwa=cwa, neighbor=neighbor, fraction=fraction):
                    spatial.WeatherZone.objects.all().delete()
                    self.add_zone("forecast", *toward(block, center, neighbor, fraction))
                    flags = self.load(cwa, block)
                    land = [k for k, v in flags.items() if v == LAND]
                    self.assertEqual(land, [expected])

    def test_antimeridian_both_sides(self):
        """Test that a cell straddling ±180 hits zones on both sides."""
        # 40% toward (213, 200) and (215, 200)
        self.add_zone("marine:coastal", 179.9926, 54.0850)
        self.add_zone("forecast", -179.9768, 54.0954)
        flags = self.load("ALU", ALU_BLOCK)
        self.assertEqual(flags[(214, 200)], BOTH)
        self.assertEqual(flags[(213, 200)], NEITHER)
        self.assertEqual(flags[(215, 200)], NEITHER)

    def test_antimeridian_not_world_wide(self):
        """Test that a cell straddling ±180 doesn't wrap around the globe."""
        # An unsplit cell spans -180..180 and hits anything at its latitude
        self.add_zone("forecast", 0, 54.09)
        self.add_zone("marine:offshore", -90, 54.09)
        flags = self.load("ALU", ALU_BLOCK)
        self.assertEqual(set(flags.values()), {NEITHER})
