// eslint-disable-next-line import/no-unresolved
import uswds from "@uswds/compile";

uswds.settings.version = 3;

uswds.paths.dist.theme = "./assets/sass";
uswds.paths.dist.css = "./assets/css";
uswds.paths.dist.img = "./assets/images/uswds/";
uswds.paths.dist.fonts = "./assets/fonts";
uswds.paths.dist.js = "./assets/js";

export const compile = uswds.compile;
export const init = uswds.init;
export const watch = uswds.watch;
