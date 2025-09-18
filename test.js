import { Simulation, Resource, Store } from "./index.js";

const sim = new Simulation();

function* my_process(sim) {
    yield sim.event().succeed();
    console.log('Step 1 at time ' + sim.now());
    yield sim.timeout(1);
    console.log('Step 2 at time ' + sim.now());
    yield sim.timeout(1);
    console.log('Step 3 at time ' + sim.now());
    try {
        yield sim.event().fail(Error('Failed Event'));
    } catch {
        console.log('Recovered from error at time ' + sim.now());
    }
    return 150;
}

function log(ev, arg) {
    console.log('At time ' + ev.sim.now() + ' process ' + arg + ' stopped with value ' + ev.result);
}

const proc = sim.process(my_process(sim));
const cb = proc.append_callback(log, 'not');
proc.append_callback(log, 'really');
proc.remove_callback(cb);
const ev = sim.timeout(158);
ev.append_callback((ev) => console.log('Simulation stopped at time ' + ev.sim.now()));
sim.run(ev);

const ev1 = sim.event();
const ev2 = sim.event();
const ev3 = sim.event();

function* ev_process(sim, ev1, ev2, ev3) {
    yield sim.timeout(20);
    yield ev1.succeed({result: 'Yes'});
    yield sim.timeout(20);
    yield ev2.succeed({result: 'No'});
    yield sim.timeout(20);
    yield ev3.succeed({result: 'Maybe'});
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

function* provide_letters(sim, store, word) {
    for (const letter of word) {
        console.log(sim.now() + ': letter \'' + letter + '\' ready for storage');
        yield store.put(letter);
        console.log(sim.now() + ': letter \'' + letter + '\' stored');
        yield sim.timeout(2);
    }
}

function* take_letters(sim, store, word) {
    for (const letter of word) {
        console.log(sim.now() + ': letter \'' + letter + '\' needed');
        const nice_letter = yield store.get((item) => item === letter);
        console.log(sim.now() + ': letter \'' + nice_letter + '\' taken');
        yield sim.timeout(1);
    }
}

const store = new Store(sim, 3);
sim.process(provide_letters(sim, store, 'banana'));
sim.process(take_letters(sim, store, 'naban'));
sim.run(700);