SIM_DAYS = 200;
START_DATE = new Date('2020-01-25');


// BAY AREA
// SCENARIO A init 0.88e-7 infectionFatalityRate: 0.01
// SCENARIO B init 1.7e-7 infectionFatalityRate: 0.005 lockdown 0.5
// SCENARIO C init 0.88e-6 infectionFatalityRate: 0.001 lockdown 0.5

// SOCAL
// SCENARIO A init 1.2e-8 infectionFatalityRate: 0.01 lockdown 0.5

const geography = {
  bayArea: {
    size: 7.75,
    density: 868,
    lockdown: new Date('2020-03-16'),
    initialInfected: 1.2e-5, // in millions, on 1/25
  },
  soCal: {
    size: 22.1,
    density: 392,
    lockdown: new Date('2020-03-19'),
    initialInfected: 3.2e-6, // in millions, on 1/25
  },
  rural: {
    size: 11,
    density: 122,
    lockdown: new Date('2020-03-19'),
  },
};

const COVID = {
  baseRate: 9e-5,
  communityAttackRate: 0.4,
  severeSymptomaticRate: 0.25,
  infectionFatalityRate: 0.005,
  incubationTimeDays: 2,
  isolationBeginsDays: 7,
  fatalityAtDays: 17,
  recoveryTimeDays: 21,
  lockdownFactor: 0.85, // prevents this fraction of interactions
};

function doStep(population, time) {
  const susceptible = COVID.communityAttackRate*population.size - population.totalEverInfected;
  const rate = COVID.baseRate*population.density*
      (time > population.lockdown ? 1.0 - COVID.lockdownFactor : 1.0);
  const newInfected = rate*population.contagious*susceptible;

  population.infected[time.getTime()] = newInfected;
  population.totalEverInfected += newInfected;

  population.contagious += population.infected[subtractDays(time, COVID.incubationTimeDays)];

  const newIsolated = population.infected[subtractDays(time, COVID.isolationBeginsDays)]*COVID.severeSymptomaticRate;
  population.contagious -= newIsolated;

  const newDead = population.infected[subtractDays(time, COVID.fatalityAtDays)]*COVID.infectionFatalityRate;
  population.contagious -= newDead;
  population.infected[subtractDays(time, COVID.fatalityAtDays)] -= newDead;
  population.totalFatalities += newDead;

  const newRecovered = population.infected[subtractDays(time, COVID.recoveryTimeDays)];
  population.recovered += newRecovered;
  population.contagious = Math.max(0, population.contagious - newRecovered);

  // console.log('inf', 1e6*newInfected, 'rec', 1e6*newRecovered, 'iso', 1e6*newIsolated);
}

function subtractDays(baseTime, days) {
  return new Date(baseTime.getTime() - days*24*3600*1000).getTime();
}


function initializePopulation(geography) {
  let obj = Object.assign({}, geography, {
    totalEverInfected: geography.initialInfected,
    contagious: 0,
    recovered: 0,
    totalFatalities: 0,
    infected: [],
  });

  for(let i=0; i<SIM_DAYS+COVID.recoveryTimeDays; i++){
    obj.infected[START_DATE.getTime() + (i- COVID.recoveryTimeDays)*24*3600*1000] = 0;
  }

  obj.infected[START_DATE.getTime()] = geography.initialInfected;

  return obj;
}

let pop = initializePopulation(geography.soCal);
let time = new Date(START_DATE);
for(let i=0; i<SIM_DAYS; i++){
  time = new Date(time.getTime() + 24*3600*1000);
  doStep(pop, time);
  console.log(i, time,
      Math.round(1e6*pop.totalEverInfected),
      Math.round(1e6*pop.totalFatalities),
      Math.round(1e6*pop.contagious),
      Math.round(1e6*pop.recovered),
  );
}

/*

observed death data
date                      BA       SOCAL   RURAL
2020-03-04                0        0        1
2020-03-05                0        0        0
2020-03-06                0        0        0
2020-03-07                0        0        1
2020-03-08                0        0        0
2020-03-09                1        0        0
2020-03-10                0        0        0
2020-03-11                0        1        0
2020-03-12                0        0        0
2020-03-13                1        0        0
2020-03-14                0        0        0
2020-03-15                1        0        0
2020-03-16                2        2        1
2020-03-17                0        1        1
2020-03-18                2        0        2
2020-03-19                0        1        1
2020-03-20                4        1        0
2020-03-21                0        3        1
2020-03-22                2        4        1
2020-03-23                4        2        1
2020-03-24                4        6        0
2020-03-25                6        6        3
2020-03-26                5        10        1
2020-03-27                5        12        2
2020-03-28                1        0        0

*/



