import { Simulation, Resource } from '../index.js';
import { getRandomIntInclusive } from '../utils.js';

const NUM_MACHINES = 2;
const WASH_TIME = 5;
const T_INTER = 7;
const SIM_TIME = 20;

class CarWash {
    machine;
    wash_time;

    constructor(machine, wash_time) {
        this.machine = machine;
        this.wash_time = wash_time;
    }

    * wash(sim, name) {
        yield sim.timeout(this.wash_time);
        const pct_dirt = getRandomIntInclusive(50, 99);
        console.log('Carwash removed ' + pct_dirt + '% of ' + name + '\'s dirt.');
    }
}

function* car(sim, name, carwash) {
    console.log(name + ' arrives at the carwash at ' + sim.now() + '.');
    using request = carwash.machine.lock();
    yield request;
    console.log(name + ' enters the carwash at ' + sim.now() + '.');
    yield sim.process(carwash.wash(sim, name));
    console.log(name + ' leaves the carwash at ' + sim.now() + '.');
}

function* setup(sim, num_machines, wash_time, t_inter) {
    const machine = new Resource(sim, num_machines);
    const carwash = new CarWash(machine, wash_time);
    let car_count = 0;

    for (let i=0; i<4; i++) {
        sim.process(car(sim, 'Car ' + ++car_count, carwash));
    }

    while (true) {
        yield sim.timeout(getRandomIntInclusive(t_inter-2, t_inter+2));
        sim.process(car(sim, 'Car ' + ++car_count, carwash));
    }
}

const sim = new Simulation();
sim.process(setup(sim, NUM_MACHINES, WASH_TIME, T_INTER));
sim.run(SIM_TIME);