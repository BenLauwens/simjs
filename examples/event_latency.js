import { Simulation, Store } from '../index.js';

const SIM_DURATION = 100;

class Cable {
    sim;
    delay;
    store;

    constructor(sim, delay) {
        this.sim = sim;
        this.delay = delay;
        this.store = new Store(sim);
    }

    * latency(value) {
        yield this.sim.timeout(this.delay);
        this.store.put(value);
    }

    put(value) {
        this.sim.process(this.latency(value));
    }

    get() {
        return this.store.get();
    }
}

function* sender(sim, cable) {
    while (true) {
        yield sim.timeout(5);
        cable.put('Sender sent this at ' + sim.now());
    }
}

function* receiver(sim, cable) {
    while (true) {
        const msg = yield cable.get();
        console.log('Received this at ' + sim.now() + ' while ' + msg);
    }
}

const sim = new Simulation();
const cable = new Cable(sim, 10);
sim.process(sender(sim, cable));
sim.process(receiver(sim, cable));
sim.run(SIM_DURATION);