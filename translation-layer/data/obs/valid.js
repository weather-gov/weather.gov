export default (observation) => {
  if (observation.temperature.value === null) {
    return false;
  }
  return true;
};
