SIM_DAYS = 200;
START_DATE = new Date('2020-01-25');

const geography = {
  bayArea: {
    size: 7.75,
    density: 868,
    lockdown: new Date('2020-03-16'),
    initialInfected: 1.2e-5, // in millions, on 1/25
    unlock: new Date('2022-06-27'),
  },
  la: {
    size: 13.3,
    density: 900,
    lockdown: new Date('2020-03-19'),
    initialInfected: 4e-7, // in millions, on 1/25
  },
  nyc: {
    size: 23.7,
    density: 400, //5318,
    lockdown: new Date('2020-03-22'),
    initialInfected: 20e-6, // in millions, on 1/25
    unlock: new Date('2020-05-07'),
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
  lockdownFactor: 0.8, // prevents this fraction of interactions
};

function doStep(population, time, dt=1) {
  const susceptible = COVID.communityAttackRate*population.size - population.totalEverInfected;
  const rate = COVID.baseRate*population.density*
      (time > population.lockdown && time < population.unlock ? 1.0 - COVID.lockdownFactor : 1.0);
  const newInfected = dt*rate*population.contagious*susceptible;

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

  // reinfection
  if(time > population.unlock) population.infected[time.getTime()] += 1e-6;

  return newDead;
}

function subtractDays(baseTime, days) {
  return new Date(baseTime.getTime() - days*24*3600*1000).getTime();
}


function initializePopulation(geography, dt=1) {
  let obj = Object.assign({}, geography, {
    totalEverInfected: geography.initialInfected,
    contagious: 0,
    recovered: 0,
    totalFatalities: 0,
    infected: [],
  });

  for(let i=0; i<SIM_DAYS+Math.round(1/dt)*COVID.recoveryTimeDays; i++){
    obj.infected[START_DATE.getTime() + (dt*i - COVID.recoveryTimeDays)*24*3600*1000] = 0;
  }

  obj.infected[START_DATE.getTime()] = geography.initialInfected;
  return obj;
}

const dt = 0.25;
let pop = initializePopulation(geography.bayArea, dt);
let time = new Date(START_DATE);

console.log('day,deaths,deathsper10M');
for(let i=0; i<SIM_DAYS; i++){
  let dailyDeathToll = 0;
  for(let j=0; j<1/dt; j++) {
    time = new Date(time.getTime() + dt*24*3600*1000);
    dailyDeathToll += doStep(pop, time, dt);
    // console.log(i, time,
    //     Math.round(1e6*pop.totalEverInfected),
    //     Math.round(1e6*pop.totalFatalities),
    //     Math.round(1e6*pop.contagious),
    //     Math.round(1e6*pop.recovered),
    // );
  }
  console.log([time.toLocaleDateString(), Math.round(dailyDeathToll*1e6), dailyDeathToll/pop.size*1e7].join(','));
}
console.log('Total fatalities:', Math.round(1e6*pop.totalFatalities));
console.log('Total fatalities per 10M:',pop.totalFatalities/pop.size*1e7);
console.log('Total ever infected:', Math.round(1e6*pop.totalEverInfected));

/*

observed death data
date          BA   LA_METRO   OTHER
2020-03-04    0    0    1
2020-03-05    0    0    0
2020-03-06    0    0    0
2020-03-07    0    0    1
2020-03-08    0    0    0
2020-03-09    1    0    0
2020-03-10    0    0    0
2020-03-11    0    1    0
2020-03-12    0    0    0
2020-03-13    1    0    0
2020-03-14    0    0    0
2020-03-15    1    0    0
2020-03-16    2    2    1
2020-03-17    0    1    1
2020-03-18    2    0    2
2020-03-19    0    1    1
2020-03-20    4    1    0
2020-03-21    0    3    1
2020-03-22    2    3    2
2020-03-23    4    2    1
2020-03-24    4    5    1
2020-03-25    6    6    3
2020-03-26    5    9    2
2020-03-27    5    9    5
2020-03-28    8    6    3
2020-03-29    3    7    3
2020-03-30    7    8    2


*/



