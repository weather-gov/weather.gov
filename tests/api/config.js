let bundling = false;
let bundleID = false;
let localService = true;
let recording = false;

export default {
  get bundling() {
    return bundling;
  },
  set bundling(v) {
    bundling = v;
    if (v === false) {
      console.log(`CONFIG:   bundle ${bundleID} finished`);
      bundleID = false;
    }
  },

  get bundleID() {
    return bundleID;
  },
  set bundleID(v) {
    if (bundling && !bundleID) {
      bundleID = v;
      console.log(`CONFIG:   starting bundle ${bundleID}`);
    }
  },

  get localService() {
    return localService;
  },
  set localService(v) {
    localService = v;
  },

  get recording() {
    return recording;
  },
  toggleRecording() {
    recording = !recording;
  },
};
