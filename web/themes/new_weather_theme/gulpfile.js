const uswds = require("@uswds/compile");

uswds.settings.version = 3;

uswds.paths.dist.theme = "./assets/sass";
uswds.paths.dist.css = "./assets/css";
uswds.paths.dist.img = "./assets/images/uswds/";
uswds.paths.dist.fonts = "./assets/fonts";
uswds.paths.dist.js = "./assets/js";

exports.compile = uswds.compile;
exports.init = uswds.init;
exports.watch = uswds.watch;