import {Simulation, Resource} from '../index.js';

const NUM_MACHINES = 2;
const WASH_TIME = 5;
const T_INTER = 7;
const SIM_TIME = 20;

function getRandomIntInclusive(min, max) {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled); // The maximum is inclusive and the minimum is inclusive
}

class CarWash {
    machine;
    wash_time;

    constructor(num_machines, wash_time) {
        this.machine = new Resource(num_machines);
        this.wash_time = wash_time;
    }

    * wash(sim, name) {
        yield sim.timeout(this.wash_time);
        pct_dirt = getRandomIntInclusive(50, 99);
        console.log('Carwash removed ' + pct_dirt + '% of ' + name + '\'s dirt.');
    }
}

function* car(sim, name, carwash) {
    console.log(name + ' arrives at the carwash at ' + sim.now());
    using request = sim.lock(carwash.machine);
    yield request;
    console.log(name + ' enters the carwash at ' + sim.now());
    yield sim.process(carwash.wash, name);
    console.log(name + ' leaves the carwash at ' + sim.now());
}

function* setup(num_machines, wash_time, t_inter) {
    const carwash = new CarWash(num_machines, wash_time);
    let car_count = 0;

    for (let i; i<4; i++) {
        sim.process(car, 'car ' + ++car_count, carwash);
    }

    while (true) {
        yield sim.timeout(getRandomIntInclusive(t_inter-2, t_inter+2));
        sim.process(car, 'car ' + ++car_count, carwash);
    }
}

const sim = new Simulation();
sim.process(setup, NUM_MACHINES, WASH_TIME, T_INTER);
sim.run(SIM_TIME);