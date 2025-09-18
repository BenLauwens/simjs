import { Simulation, Resource } from "./index.js";

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

const proc = sim.process(my_process(sim));
const cb = proc.append_callback(log, 'not');
proc.append_callback(log, 'really');
proc.remove_callback(cb);
const ev = sim.timeout(158);
ev.append_callback((sim, _) => console.log('Simulation stopped at time ' + sim.now()));
sim.run(ev);

const ev1 = sim.event();
const ev2 = sim.event();
const ev3 = sim.event();

function* ev_process(sim, ev1, ev2, ev3) {
    yield sim.timeout(20);
    yield sim.succeed(ev1, {result: 'Yes'});
    yield sim.timeout(20);
    yield sim.succeed(ev2, {result: 'No'});
    yield sim.timeout(20);
    yield sim.succeed(ev3, {result: 'Maybe'});
}

function* op_process(sim, ev1, ev2, ev3) {
    console.log('Before at time ' + sim.now());
    const results = yield sim.and(sim.or(ev1, ev3), ev2);
    console.log(results);
    console.log('After at time ' + sim.now());
}

sim.process(ev_process(sim, ev1, ev2, ev3));
sim.process(op_process(sim, ev1, ev2, ev3));

sim.run(300);

const res = new Resource(sim, 1);

function* lock_process(sim, res){
    for (let i=0; i<10; i++) {
        yield res.lock();
        console.log('Lock ' + i + ' at time ' + sim.now());
        yield sim.timeout(5);
        res.unlock();
        console.log('Unlock ' + i + ' at time ' + sim.now());
    }
}

function* lock_prio_process(sim, res){
    for (let i=0; i<10; i++) {
        using lock = res.lock({priority: 1});
        yield lock;
        console.log('Lock prio ' + i + ' at time ' + sim.now());
        yield sim.timeout(10);
        console.log('Unlock prio ' + i + ' at time ' + sim.now());
    }
}

sim.process(lock_prio_process(sim, res));
sim.process(lock_process(sim, res));

sim.run(600);