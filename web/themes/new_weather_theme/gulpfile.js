const uswds = require("@uswds/compile");

uswds.settings.version = 3;

uswds.paths.dist.theme = "./sass";
uswds.paths.dist.css = "./assets/uswds/css";
uswds.paths.dist.img = "./assets/uswds/img";
uswds.paths.dist.fonts = "./assets/uswds/fonts";
uswds.paths.dist.js = "./assets/uswds/js";

exports.compile = uswds.compile;
exports.init = uswds.init;
exports.watch = uswds.watch;