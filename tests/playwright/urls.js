/**
 * Get the URLs for the various services based on
 * environment variables or defaults.
 */
const Services = {
  get interopURL(){
    const found = process.env.INTEROP_URL;
    if(found && found != ""){
      return found;
    } else {
      return "http://localhost:8082";
    }
  },

  get apiURL(){
    const found = process.env.API_URL;
    if(found && found != ""){
      return found;
    } else {
      return "http://localhost:8081";
    }
  },

  get webURL(){
    const found = process.env.WEB_URL;
    if(found && found != ""){
      return found;
    } else {
      return "http://localhost:8080";
    }
  },

  interop(path){
    return this._composePath(this.interopURL, path);
  },

  apiProxy(path){
    return this._composePath(this.apiURL, path);
  },

  webApp(path){
    return this._composePath(this.webURL, path);
  },

  _composePath(url, path){
    if(url.endsWith("/")){
      url = url.slice(0, -1);
    }
    let spacer = "";
    if(!path.startsWith("/")){
      spacer = "/";
    }
    return `${url}${spacer}${path}`;
  }
};

module.exports = Services;
