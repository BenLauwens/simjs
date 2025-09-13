import { Simulation } from "./index.js";

const sim = new Simulation();

function* my_process(sim) {
    yield sim.succeed(sim.event());
    console.log('Step 1 at time ' + sim.now());
    yield sim.timeout(1);
    console.log('Step 2 at time ' + sim.now());
    yield sim.timeout(1);
    console.log('Step 3 at time ' + sim.now());
    try {
        yield sim.fail(sim.event(), Error('Failed Event'));
    } catch {
        console.log('Recovered from error at time ' + sim.now());
    }
    return 150;
}

function log(sim, ev, arg) {
    console.log('At time ' + sim.now() + ' process ' + arg + ' stopped with value ' + ev.result);
}

const proc = sim.process(my_process);
const cb = proc.append_callback(log, 'not');
proc.append_callback(log, 'really');
proc.remove_callback(cb);
sim.run(sim.timeout(158));

const ev1 = sim.event();
const ev2 = sim.event();
const ev3 = sim.event();

function* ev_process(sim, ev1, ev2, ev3) {
    yield sim.timeout(20);
    yield sim.succeed(ev1);
    yield sim.timeout(20);
    yield sim.succeed(ev2);
    yield sim.timeout(20);
    yield sim.succeed(ev3);
}

function* op_process(sim, ev1, ev2, ev3) {
    console.log('Before at time ' + sim.now());
    yield sim.and(sim.or(ev1, ev3), ev2);
    console.log('After at time ' + sim.now());
}

sim.process(ev_process, ev1, ev2, ev3);
sim.process(op_process, ev1, ev2, ev3);

sim.run(300)