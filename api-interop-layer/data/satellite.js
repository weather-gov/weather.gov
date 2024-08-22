export default async ({ grid: { wfo } }) => {
  try {
    const satelliteMetadata = await fetch(
      `https://cdn.star.nesdis.noaa.gov/WFO/catalogs/WFO_02_${wfo.toLowerCase()}_catalog.json`,
    ).then((r) => r.json());

    const satellite = satelliteMetadata.meta.satellite;
    if (satellite) {
      const goes = satellite === "GOES-West" ? "GOES18" : "GOES16";

      return {
        gif: `https://cdn.star.nesdis.noaa.gov/WFO/${wfo.toLowerCase()}/GEOCOLOR/${goes}-${wfo.toUpperCase()}-GEOCOLOR-600x600.gif`,
      };
    }
  } catch (e) {
    console.log(`Error getting satellite metadata for ${wfo}`);
    console.log(e.message);
  }

  return {};
};
