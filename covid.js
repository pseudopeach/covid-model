SIM_DAYS = 500;
START_DATE = new Date('2020-01-25');

const geographies = {
  uk: {
    name: 'United Kingdom',
    size: 66.65,
    density: 600,
    initialInfected: 500e-4, // in millions, start date
    anyVaxFraction: 0.63,
    lockdown: new Date('2021-05-01'),
    simStart: new Date('2021-05-01'),
    lockdowns: {
      'first-lockdown': null,
      'second-lockdown': null,
      'partial-lockdown': {
        start: new Date('2021-05-01'),
        end: new Date('2021-07-01'),
      },
    },
  },
  florida: {
    name: 'State of Florida',
    size: 21.5,
    density: 1800,
    initialInfected: 400e-4, // in millions, start date
    anyVaxFraction: 0.55,
    simStart: new Date('2021-06-01'),
  },

  california: {
    name: 'California',
    size: 31,
    density: 1100,
    simStart: new Date('2021-06-01'),
    initialInfected: 200e-4,
    anyVaxFraction: 0.65,

  },
  
};

const COVID = {
  baseRate: 18e-6,
  communityAttackRate: 0.4,
  severeSymptomaticRate: 0.02,
  infectionFatalityRate: 0.0006,
  incubationTimeDays: 2,
  isolationBeginsDays: 7,
  fatalityAtDays: 17,
  recoveryTimeDays: 21,
  lockdownFactor: 0.35, // prevents this fraction of interactions
};

function runSimulation(geoName, lockdowns, timeRes, verbose=false) {
  console.log('running sim...', lockdowns)
  let outputStats = { fatalitiesByDay: [], totalFatalities: 0, totalFatalitiesPerCapita: 0, totalEverInfected: 0 };
  const dt = timeRes;
  let time = new Date(geographies[geoName].simStart || START_DATE);
  let pop = initializePopulation(time, geographies[geoName], dt);

  // console.log('day,deaths,deathsper10M');
  for(let i=0; i<SIM_DAYS; i++){
    let dailyDeathToll = 0;
    let dailyInfected = 0;
    for(let j=0; j<1/dt; j++) {
      time = new Date(time.getTime() + dt*24*3600*1000);
      [newInfected, newDead] = doStep(pop, time, lockdowns, dt);
      dailyInfected += newInfected;
      dailyDeathToll += newDead;
    }
    // console.log([time.toLocaleDateString(), Math.round(dailyDeathToll*1e6), dailyDeathToll/pop.size*1e7].join(','));
    outputStats.fatalitiesByDay.push({ date: time, value: dailyDeathToll/pop.size*1e5 });
    if(verbose) {
      console.log(i, time,
          Math.round(1e6*dailyInfected),
          Math.round(1e6*dailyDeathToll),
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
  const susceptible = COVID.communityAttackRate*(1.0 - population.anyVaxFraction)*population.size - population.totalEverInfected;
  const rate = COVID.baseRate*population.density*(1.0 - getLockdownFactor(lockdowns, time));
  const newInfected = dt*rate*population.contagious*susceptible;

  population.infected[time.getTime()] = newInfected;
  population.totalEverInfected += newInfected;

  const newContagious = population.infected[subtractDays(time, COVID.incubationTimeDays)];
  population.contagious += newContagious;

  const newIsolated = population.infected[subtractDays(time, COVID.isolationBeginsDays)]*COVID.severeSymptomaticRate;
  population.contagious -= newIsolated;

  population.hospitalizedOn[time.getTime()] = newIsolated;
  population.hospitalized += newIsolated;
  population.hospitalized -= population.hospitalizedOn[subtractDays(time, COVID.isolationBeginsDays)];
  console.log('*** hosp', 1e6*population.hospitalized)

  const newDead = population.infected[subtractDays(time, COVID.fatalityAtDays)]*COVID.infectionFatalityRate;
  population.contagious -= newDead;
  population.infected[subtractDays(time, COVID.fatalityAtDays)] -= newDead;
  population.totalFatalities += newDead;

  const newRecovered = population.infected[subtractDays(time, COVID.recoveryTimeDays)];
  population.recovered += newRecovered;
  population.contagious = Math.max(1e-8, (population.contagious - newRecovered*(1.0 - COVID.severeSymptomaticRate)));

  return [newInfected, newDead];
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


function initializePopulation(startTime, geography, dt=1) {
  let obj = Object.assign({}, geography, {
    totalEverInfected: geography.initialInfected,
    contagious: 0,
    recovered: 0,
    totalFatalities: 0,
    hospitalized: 0,
    infected: [],
    hospitalizedOn: [],
  });

  for(let i=0; i<SIM_DAYS+Math.round(1/dt)*COVID.recoveryTimeDays; i++){
    obj.infected[startTime.getTime() + (dt*i - COVID.recoveryTimeDays)*24*3600*1000] = 0;
    obj.hospitalizedOn[startTime.getTime() + (dt*i - COVID.recoveryTimeDays)*24*3600*1000] = 0;
  }

  obj.infected[startTime.getTime()] = geography.initialInfected;
  return obj;
}


runSimulation('california', [], timeRes=1, verbose=true);

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



