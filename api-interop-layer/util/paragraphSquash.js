export default (str) => str?.replace(/([^\n])\n([^\n])/gm, "$1 $2");
