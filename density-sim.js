RUN_SIZE = 100000000;
AREA_DIM = 5;

let sizes = [
    Math.sqrt(0.5),
    Math.sqrt(1),
    Math.sqrt(2),
    Math.sqrt(4),
    Math.sqrt(8),
    Math.sqrt(16),
    Math.sqrt(32),
];
const n = 100;
for (let dim of sizes) {
  const items = makeItems(n, dim);
  const c = getCount(items, dim);
  console.log(n/(dim*dim), c/RUN_SIZE/n);
}

function makeItems(n, areaDim) {

  let items = [];
  for (let i=0; i<n; i++) {
    items.push([Math.random()*areaDim, Math.random()*areaDim]);
  }

  return items;
}

function getCount(items, areaDim) {
  let encounterCount = 0;
  const pos = [Math.random()*areaDim, Math.random()*areaDim];
  for(let i=0; i<RUN_SIZE; i++) {
    for(let item of items) {
      if(Math.pow(pos[0] - item[0], 2) + Math.pow(pos[1] - item[1], 2) < 1.0) encounterCount++;
    }
  }

  return encounterCount;
}