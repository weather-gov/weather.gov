# We will use Geobuf for spatial data encoding

Date: 2026-04-22

### Status

Accepted

### Context

The application frequently needs to transmit large geometric boundaries, such as state and county borders, as well as complex weather alerts and radar geometries. Transmitting this data over the network in plain GeoJSON can result in very large payload sizes, which can negatively impact page load times and Time to First Byte (TTFB). Compressing these geometries is necessary to ensure optimal frontend performance.

### Decision

We will use Geobuf (`geobuf`) to encode and compress our spatial data and GeoJSON objects. 
- On the backend, we use the `geobuf` Python library to encode GeoJSON dictionaries into `.pbf` (Protocolbuffer Binary Format) data payloads. 
- On the frontend, we use the `geobuf` JavaScript library to decode these binary streams back into usable GeoJSON objects.

### Size gate on county pages

State pages always go over the wire as Geobuf. County pages are gated on size: the view sums the
byte length of the county boundary plus every alert geometry, and only past 30,000 bytes does it
strip those geometries from the inline page data and let the map fetch them from
`wx/county/<fips>/` and `wx/county/<fips>/alerts`. Under the threshold the geometries stay inline
as GeoJSON and the page loads neither `pbf` nor `geobuf`. Most counties are quiet enough to stay
under it, so paying for two extra requests and two JavaScript libraries is not worth it there.

### Consequences

- **Reduced Payload Sizes**: Geobuf offers significant compression over standard GeoJSON, improving network transfer speeds.
- **Client-Side Decoding Overhead**: The frontend must load the `geobuf` JavaScript library and spend CPU cycles decoding the binary payloads before they can be rendered. 
- **Binary Transport**: Debugging spatial responses directly in the network tab may be more difficult since the payloads are binary `.pbf` rather than human-readable JSON.

### Alternatives Considered

We considered several other spatial encoding formats before selecting Geobuf.

| Format | Pros | Cons |
| :--- | :--- | :--- |
| **GeoJSON** | Ubiquitous, native to JavaScript, human-readable, easy to debug. | Extremely verbose, large file sizes, slow parsing for large geometries. |
| **TopoJSON** | Excellent compression by removing shared edges, human-readable. | Requires decoding on the frontend, lossy (quantized precision), complex generation. |
| **FlatGeobuf** | High performance streaming, zero-copy deserialization, built-in spatial indexing (R-Tree). | Larger payload than Geobuf for smaller/simpler datasets, more complex client implementation. |
| **Mapbox Vector Tiles (MVT)** | Optimized for rendering, clips geometries to tiled grids. | Lossy (quantized coordinates), requires dedicated tile server infrastructure, not suited for raw geometry retrieval. |

Geobuf was chosen because our primary goal is maximum compression and fast serialization/deserialization for raw GeoJSON objects without requiring tile servers or advanced streaming features.
