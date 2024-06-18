import dayjs from 'https://esm.sh/dayjs';
import utc from 'https://esm.sh/dayjs/plugin/utc';
import timezone from 'https://esm.sh/dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const ALERTS_INFO_URL = "https://api.weather.gov/alerts/active?area=NY";
const alertsResponse = await fetch(ALERTS_INFO_URL);
const alertsData = await alertsResponse.json();

const processFiles = files => {
  return files.filter(filename => {
    return filename && filename !== "";
  }).map(filename => {
    const match = filename.match(/(?<year>[0-9]{4})(?<month>[0-9]{2})(?<day>[0-9]{2})\.(?<hour>[0-9]{2})(?<min>[0-9]{2})\..+$/);
    if(match.groups){
      const { year, month, day, hour, min } = match.groups;
      const timestamp = `${year}-${month}-${day}T${hour}:${min}:00-00:00`;
      return {
        timestamp,
        filename
      };
    }
    return false;
  }).filter(item => item !== false);
};

const findMatchingAlerts = (entry, AWIPSidentifier) => {
  return alertsData.features.filter(feature => {
    return feature.properties.parameters["AWIPSidentifier"][0] == AWIPSidentifier;
  }).filter(alert => {
    const alertSentTime = dayjs.utc(alert.sent);
    const entryTime = dayjs.utc(entry.timestamp);
    console.log(`Comparing ${alertSentTime} to ${entryTime}`);
    return alertSentTime.isSame(entryTime);
  });
};

console.log(`Found ${alertsData.features.length} alerts`);

const info = alertsData.features.map(feature => {
  const identifier = feature.properties.parameters["AWIPSidentifier"][0];
  const alertCode = identifier.substring(0, 3);
  const wfoCode = identifier.substring(3);
  const event = feature.properties.event;
  const url = `https://www.weather.gov/source/translate/data/${wfoCode}/es/${alertCode}/translations.json`;
  return new Promise((resolve, reject) => {
    fetch(url).then(async res => {
      if(res.ok){
        const files = await res.json();
        let processedFiles = processFiles(files);
        let validAlerts = processedFiles.map(entry => {
          return findMatchingAlerts(entry, identifier);
        });
        resolve({
          wfoCode,
          alertCode,
          event,
          info: processedFiles,
          alerts: validAlerts,
          files: files
        });
      } else {
        resolve({
          wfoCode,
          alertCode,
          event,
          files: false
        });
      }
    });
  });
});

const result = await Promise.all(info);


const failures = result.filter(item => {
  return item.files == false;
});

const validInfo = result.filter(item => item.files);

const output = {
  successes: validInfo,
  failures: failures
};

console.log(output);


