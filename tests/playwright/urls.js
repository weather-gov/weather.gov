/**
 * Get the URLs for the various services based on
 * environment variables or defaults.
 */
const Services = {
  get interopURL() {
    const found = process.env.INTEROP_URL;
    if (found && found != "") {
      return found;
    } else {
      return "http://localhost:8082";
    }
  },

  get apiURL() {
    const found = process.env.API_URL;
    if (found && found != "") {
      return found;
    } else {
      return "http://localhost:8081";
    }
  },

  get webURL() {
    const found = process.env.WEB_URL;
    if (found && found != "") {
      return found;
    } else {
      return "http://localhost:8080";
    }
  },

  interop(path) {
    return this.composePath(this.interopURL, path);
  },

  apiProxy(path) {
    return this.composePath(this.apiURL, path);
  },

  webApp(path) {
    return this.composePath(this.webURL, path);
  },

  composePath(url, path) {
    let newUrl = url;
    if (url.endsWith("/")) {
      newUrl = url.slice(0, -1);
    }
    let spacer = "";
    if (!path.startsWith("/")) {
      spacer = "/";
    }
    return `${newUrl}${spacer}${path}`;
  },
};

module.exports = Services;
