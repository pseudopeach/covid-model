const fs = require('fs');

const contents = fs.readFileSync('covid19-ca.json', 'utf8');
const data = JSON.parse(contents);

const BAY_AREA = ['san francisco', 'san mateo', 'santa clara', 'alameda',
  'contra costa', 'napa', 'sonoma', 'marin', 'solano'];

const SO_CAL = ['los angeles', 'orange', 'riverside', 'san bernardino', 'santa barbara',
  'san diego', 'san luis obispo', 'imperial', 'kern', 'ventura'];

const LA_METRO = ['los angeles', 'orange', 'riverside', 'san bernardino', 'ventura'];

outputData = Array(100);
const startDate = new Date('2020-01-25');

for(let [i, elem] of data.entries()) {
  if(i <= 3) continue;
  if(elem.CATEGORY === 'deaths') {
    for(let k in elem) {
      let date = new Date(k);
      if(date && ! isNaN(date.getTime())) {
        const index = Math.round((date.getTime() - startDate.getTime())/24/3600/1000);

        if(!outputData[index]) outputData[index] = { date: date };
        if(!isNaN(parseInt(elem[k]))) outputData[index][stripCounty(elem.GEOGRAPHY)] = parseInt(elem[k]);
      }
    }
  }
}

function stripCounty(str) {
  let tokens = str.split(' ');
  tokens.pop();
  tokens = tokens.map(t => t.toLowerCase());
  return tokens.join(' ');
}



// console.log(outputData);

let quick = [];
for(let day of outputData) {
  let row = [day.date, 0, 0, 0];
  for(let c in day) {
    if (c === 'date') continue;
    if(BAY_AREA.indexOf(c) > -1) row[1] += day[c];
    else if(SO_CAL.indexOf(c) > -1) row[2] += day[c];
    else row[3] += day[c];
    if(day[c] > 0 && BAY_AREA.indexOf(c) === -1 && SO_CAL.indexOf(c) === -1) {
      console.log(c, day.date, day[c]);
    }
  }
  console.log(row)
}
