export default (str: string) => str?.replace(/([^\n])\n([^\n])/gm, "$1 $2");
