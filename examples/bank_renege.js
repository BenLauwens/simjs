import { Simulation, Resource, EventState } from '../index.js';
import { getRandomExponential, getRandomIn } from './utils.js';

const NEW_CUSTOMERS = 5;
const INTERVAL_CUSTOMERS = 10;
const MIN_PATIENCE = 1;
const MAX_PATIENCE = 3;

function* source(sim, number, interval, counter) {
    for (let i=0; i<number; i++) {
        sim.process(customer(sim, 'Customer ' + i, counter, 12));
        yield sim.timeout(getRandomExponential(1 / interval));
    }
}

function* customer(sim, name, counter, time_in_bank) {
    const arrive = sim.now();
    console.log(arrive.toFixed(2).padStart(5, '0') + ' ' + name + ': Here I am');
    using request = counter.lock();
    const patience = getRandomIn(MIN_PATIENCE, MAX_PATIENCE);
    yield sim.or(request, sim.timeout(patience));
    const wait = sim.now() - arrive;
    if (request.state === EventState.PROCESSED) {    
        console.log(sim.now().toFixed(2).padStart(5, '0') + ' ' + name + ': Waited ' + wait.toFixed(2).padStart(5, '0'));
        yield sim.timeout(getRandomExponential(1 / time_in_bank));
        console.log(sim.now().toFixed(2).padStart(5, '0') + ' ' + name + ': Finished');
    } else {
        console.log(sim.now().toFixed(2).padStart(5, '0') + ' ' + name + ': Reneged after ' + wait.toFixed(2).padStart(5, '0'));
    }
}

const sim = new Simulation();
const counter = new Resource(sim, 1);
sim.process(source(sim, NEW_CUSTOMERS, INTERVAL_CUSTOMERS, counter));
sim.run();