const x = -92.275;
const y = 34.749;

const points = [];
for (let i = 0; i <= 360; i += 3) {
  const rad = (i * Math.PI) / 180;

  const pX = Math.sin(rad) * 0.25;
  const pY = Math.cos(rad) * 0.25;

  points.push([pX + x, pY + y]);
}

console.log(JSON.stringify(points));
