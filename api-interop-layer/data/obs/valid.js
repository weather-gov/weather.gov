export default (observation) => {
  if (observation.error) {
    return false;
  }

  if (observation.temperature.value === null) {
    return false;
  }
  return true;
};
