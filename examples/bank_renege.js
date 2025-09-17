import {Simulation, Resource, EventState} from '../index.js';

const NEW_CUSTOMERS = 5;
const INTERVAL_CUSTOMERS = 10;
const MIN_PATIENCE = 1;
const MAX_PATIENCE = 3;

function getRandomExponential(lambda) {
    return - Math.log(1 - Math.random()) / lambda;
}

function getRandomIn(min, max) {
    return Math.random() * (max - min) + min;
}

function* source(sim, number, interval, counter) {
    for (let i=0; i<number; i++) {
        sim.process(customer, 'Customer ' + i, counter, 12);
        yield sim.timeout(getRandomExponential(1 / interval));
    }
}

function* customer(sim, name, counter, time_in_bank) {
    const arrive = sim.now();
    console.log(arrive + ' ' + name + ': Here I am');
    using managed_request = sim.lock(counter);
    const patience = getRandomIn(MIN_PATIENCE, MAX_PATIENCE);
    const results = yield sim.or(managed_request.ev, sim.timeout(patience));
    const wait = sim.now() - arrive;
    if (managed_request.ev.state === EventState.PROCESSED) {    
        console.log(sim.now() + ' ' + name + ': Waited ' + wait);
        yield sim.timeout(getRandomExponential(1.0 / time_in_bank));
        console.log(sim.now() + ' ' + name + ': Finished');
    } else {
        console.log(sim.now() + ' ' + name + ': : Reneged after ' + wait);
    }
}

const sim = new Simulation();
const counter = new Resource(1);
sim.process(source, NEW_CUSTOMERS, INTERVAL_CUSTOMERS, counter);
sim.run();