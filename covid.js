SIM_DAYS = 500;
START_DATE = new Date('2020-01-25');

const geographies = {
  bayArea: {
    name: 'SF Bay Area',
    size: 7.75,
    density: 868,
    lockdown: new Date('2020-03-16'),
    initialInfected: 7e-6, // in millions, on 1/25
    lockdowns: {
      'first-lockdown': {
        start: new Date('2020-03-16'),
        end: new Date('2020-04-05'),
      },
      'second-lockdown': null,
      'partial-lockdown': {
        start: new Date('2020-04-05'),
        end: new Date('2020-09-15'),
      },
    },
  },
  la: {
    name: 'LA Metro',
    size: 13.3,
    density: 875,
    lockdown: new Date('2020-03-19'),
    initialInfected: 1.5e-7, // in millions, on 1/25
    lockdowns: {
      'first-lockdown': {
        start: new Date('2020-03-19'),
        end: new Date('2020-07-04'),
      },
      'second-lockdown': {
        start: new Date('2020-07-22'),
        end: new Date('2020-08-14'),
      },
      'partial-lockdown': null,
    },
  },
  nyc: {
    name: 'New York City Metro',
    size: 23.7,
    density: 400, //5318,
    lockdown: new Date('2020-03-22'),
    initialInfected: 20e-6, // in millions, on 1/25
    lockdowns: {
      'first-lockdown': {
        start: new Date('2020-03-22'),
        end: new Date('2020-05-05'),
      },
      'second-lockdown': null,
      'partial-lockdown': {
        start: new Date('2020-05-05'),
        end: new Date('2020-07-04'),
      },
    },
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
  lockdownFactor: 0.72, // prevents this fraction of interactions
};

function runSimulation(geoName, lockdowns, timeRes, verbose=false) {
  console.log('running sim...', lockdowns)
  let outputStats = { fatalitiesByDay: [], totalFatalities: 0, totalFatalitiesPerCapita: 0, totalEverInfected: 0 };
  const dt = timeRes;
  let pop = initializePopulation(geographies[geoName], dt);
  let time = new Date(START_DATE);

  // console.log('day,deaths,deathsper10M');
  for(let i=0; i<SIM_DAYS; i++){
    let dailyDeathToll = 0;
    for(let j=0; j<1/dt; j++) {
      time = new Date(time.getTime() + dt*24*3600*1000);
      dailyDeathToll += doStep(pop, time, lockdowns, dt);
    }
    // console.log([time.toLocaleDateString(), Math.round(dailyDeathToll*1e6), dailyDeathToll/pop.size*1e7].join(','));
    outputStats.fatalitiesByDay.push({ date: time, value: dailyDeathToll/pop.size*1e5 });
    if(verbose) {
      console.log(i, time,
          Math.round(1e6*pop.totalEverInfected),
          Math.round(1e6*pop.totalFatalities),
          Math.round(1e6*pop.contagious),
          Math.round(1e6*pop.recovered),
          getLockdownFactor(lockdowns, time),
      );
    }
  }

  outputStats.totalFatalities = Math.round(1e6*pop.totalFatalities);
  outputStats.totalFatalitiesPerCapita = pop.totalFatalities/pop.size*1e5;
  outputStats.totalEverInfected = Math.round(1e6*pop.totalEverInfected);

  return outputStats;
}

function doStep(population, time, lockdowns, dt=1) {
  const susceptible = COVID.communityAttackRate*population.size - population.totalEverInfected;
  const rate = COVID.baseRate*population.density*(1.0 - getLockdownFactor(lockdowns, time));
  const newInfected = dt*rate*population.contagious*susceptible;

  population.infected[time.getTime()] = newInfected;
  population.totalEverInfected += newInfected;

  const newContagious = population.infected[subtractDays(time, COVID.incubationTimeDays)];
  population.contagious += newContagious;

  const newIsolated = population.infected[subtractDays(time, COVID.isolationBeginsDays)]*COVID.severeSymptomaticRate;
  population.contagious -= newIsolated;

  const newDead = population.infected[subtractDays(time, COVID.fatalityAtDays)]*COVID.infectionFatalityRate;
  population.contagious -= newDead;
  population.infected[subtractDays(time, COVID.fatalityAtDays)] -= newDead;
  population.totalFatalities += newDead;

  const newRecovered = population.infected[subtractDays(time, COVID.recoveryTimeDays)];
  population.recovered += newRecovered;
  population.contagious = Math.max(1e-8, (population.contagious - newRecovered*(1.0 - COVID.severeSymptomaticRate)));

  return newDead;
}

function subtractDays(baseTime, days) {
  return new Date(baseTime.getTime() - days*24*3600*1000).getTime();
}

function getLockdownFactor(lockdowns, time) {
  let lockdownFactor = 0;
  for(let lock of lockdowns) {
    if(time >= lock.start && time < lock.end) lockdownFactor = COVID.lockdownFactor*lock.value;
  }

  return lockdownFactor;
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
2020-03-30    11   8    2
2020-03-31    4    21   6
2020-04-01    5    14   10
2020-04-02    10   20   5
2020-04-03    7    17   8


*/



