import fetchData from "./fetchData.js";

// Setup some custom styles for different
// shapes in our layer
const styles = {
  'LineString': new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'green',
      width: 1,
    }),
  }),
  'MultiLineString': new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'green',
      width: 1,
    }),
  }),
  'MultiPolygon': new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'yellow',
      width: 1,
    }),
    fill: new ol.style.Fill({
      color: 'rgba(255, 255, 0, 0.1)',
    }),
  }),
  'Polygon': new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'blue',
      lineDash: [4],
      width: 3,
    }),
    fill: new ol.style.Fill({
      color: 'rgba(0, 0, 255, 0.1)',
    }),
  }),
  'GeometryCollection': new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'magenta',
      width: 2,
    }),
    fill: new ol.style.Fill({
      color: 'magenta',
    }),
    image: new ol.style.Circle({
      radius: 10,
      fill: null,
      stroke: new ol.style.Stroke({
        color: 'magenta',
      }),
    }),
  }),
  'Circle': new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'red',
      width: 2,
    }),
    fill: new ol.style.Fill({
      color: 'rgba(255,0,0,0.2)',
    }),
  }),
};

const styleFunction = function (feature) {
  return styles[feature.getGeometry().getType()];
};

// A style for when a layer is selected
// or hovered over
const selectStyle = new ol.style.Style({
  fill: new ol.style.Fill({
    color: '#eeeeee',
  }),
  stroke: new ol.style.Stroke({
    color: 'rgba(255, 255, 255, 0.7)',
    width: 2,
  }),
});

// Helper functions and data for dealing
// with updating the styles of selected
// features
let selectedFeatures = [];
const clearSelectedFeatures = () => {
  if(selectedFeatures.length){
    selectedFeatures.forEach(feature => {
      feature.setStyle(undefined);
    });
  }
  selectedFeatures = [];
};

const selectFeature = (feature) => {
  selectedFeatures.push(feature);
  feature.setStyle(selectStyle);
  return true;
};

// Convenience method for zooming in
// on a given feature
const zoomToFeature = (feature, map) => {
  const geom = feature.getGeometry();
  const poly = geom.getGeometries()[0];
  map.getView().fit(geom.getExtent());
};

// Utility function to get the center
// of a feature extent
const getCenterOfExtent = extent => {
  const [x1, y1, x2, y2 ] = extent;
  const xDiff = x2 - x1;
  const yDiff = y2 - y1;
  const newX = x1 + (xDiff / 2);
  const newY = y1 + (yDiff / 2);
  return [newX, newY];
};

/**
 * Primary layer drawing function for fetching
 * and painting a single alert layer 
 */
const getAlertLayer = async (map) => {
  const alert = await fetchData();
  const layerSource = new ol.source.Vector({
    features: new ol.format.GeoJSON({featureProjection: 'EPSG:3857'}).readFeatures(alert.geometry),
    style: styleFunction
  });
  
  const layer = new ol.layer.Vector({
    title: 'added Layer',
    name: 'alert_layer',
    source: layerSource
  });

  layer.on("sourceready", (i, j) => {
    const extent = layer.getSource().getFeatures()[0].getGeometry().getExtent();
    const center = getCenterOfExtent(extent);
    // const iconFeature = new ol.Feature({
    //   geometry: new ol.geom.Point(alert.centroid.geometry.coordinates),
    // });
    const iconFeature = new ol.format.GeoJSON({featureProjection: 'EPSG:3857'}).readFeature(alert.centroid);
    const iconStyle = new ol.style.Style({
      image: new ol.style.Icon({
        src: "/Circle.svg"
      })
    });
    iconFeature.setStyle(iconStyle);
    layer.getSource().addFeature(iconFeature);
  });

  layer.set("alertData", alert);
  
  map.addLayer(layer); 
  map.changed();
};

/**
 * The main function
 */
const init = async () => {
  const map = new ol.Map({
    target: 'map',
    layers: [
      new ol.layer.Tile({
        source: new ol.source.OSM(),
      }),
    ],
    view: new ol.View({
      center: ol.proj.transform([-98.5795, 39.8283], 'EPSG:4326', 'EPSG:3857'),
      zoom: 3,
    }),
  });

  // Setup events on the map
  map.on("pointermove", event => {
    clearSelectedFeatures();

    map.forEachFeatureAtPixel(event.pixel, feat => {
      return selectFeature(feat);
    });
  });

  map.on("click", (event) => {
    clearSelectedFeatures();
    const feature = map.getFeaturesAtPixel(event.pixel)[0];
    selectFeature(feature);
    zoomToFeature(feature, map);
  });

  await getAlertLayer(map);
};

init();
