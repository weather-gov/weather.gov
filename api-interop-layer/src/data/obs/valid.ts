export default (observation: any) => {
  if (observation.error) {
    return false;
  }

  // The temperature must exist and must not be null.
  if (observation.temperature?.value === null) {
    return false;
  }
  return true;
};
