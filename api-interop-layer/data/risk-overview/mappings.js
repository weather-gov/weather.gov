// Generally, hazard outlook image URLs use the same risk names as the data, but
// in a few cases, they do not. This is a mapping for those outliers.
export const riskNameToImageNameMap = new Map([
  ["ConvectiveWind", "ThunderstormWind"],
  ["Frost/Freeze", "FrostFreeze"],
  ["Marine", "MarineHazard"],
  ["NonConvectiveWind", "Wind"],
  ["SevereThunderstorm", "SevereThunderstorms"],
  ["FireWeatherGFDI", "FireWxGFDI"],
]);

export const riskNameToKeyMapping = new Map([
  ["Blowing Dust Risk", "BlowingDust"],
  ["Blowing Snow", "BlowingSnow"],
  ["Coastal Flood Risk", "CoastalFlood"],
  ["Thunderstorm Wind Risk", "ConvectiveWind"],
  ["Excessive Rainfall Risk", "ExcessiveRainfall"],
  ["Extreme Cold Risk", "ExtremeCold"],
  ["Extreme Heat Risk", "ExtremeHeat"],
  ["Fire Risk", "ghwoFireRiskCat"],
  ["Fire Weather Risk", "FireWeather"],
  ["Fog Risk", "Fog"],
  ["Freezing Spray Risk", "FreezingSpray"],
  ["Frost/Freeze Risk", "Frost/Freeze"],
  ["Grassland Fire Danger Index (GFDI)", "FireWeatherGFDI"],
  ["Hail Risk", "Hail"],
  ["High Surf Risk", "HighSurf"],
  ["Ice Accumulation Risk", "IceAccumulation"],
  ["Lakeshore Flood Risk", "LakeshoreFlood"],
  ["Lightning Risk", "Lightning"],
  ["Marine Hazard Risk", "Marine"],
  ["Maximum WBGT Risk", "MaxWBGTRisk"],
  ["Wind Risk", "NonConvectiveWind"],
  ["Rip Current Risk", "RipRisk"],
  ["Severe Thunderstorm Risk", "SevereThunderstorm"],
  ["Snow/Sleet Risk", "SnowSleet"],
  ["Spotter Outlook", "SpotterOutlook"],
  ["Swim Risk", "SwimRisk"],
  ["Tornado Risk", "Tornado"],
  ["Waterspout Risk", "Waterspout"],
]);

// Create the reverse lookup mapping from key
// names to full risk names
export const keyToRiskNameMapping = new Map();
for (const entry of riskNameToKeyMapping.entries()) {
  keyToRiskNameMapping.set(entry[1], entry[0]);
}
