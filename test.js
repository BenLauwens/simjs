import { Simulation, Resource, Store, FilterStore } from "./index.js";
import { getRandomExponential, getRandomGaussian } from "./examples/utils.js";

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

const sim = new Simulation();
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
    let results = yield sim.and(sim.or(ev1, ev3), ev2);
    console.log(results);
    results = yield sim.allof(ev1, ev3, ev2);
    console.log(results);
    console.log('After at time ' + sim.now());
}

sim.process(ev_process(sim, ev1, ev2, ev3));
sim.process(op_process(sim, ev1, ev2, ev3));
sim.run(300);

const res = new Resource(sim, 1);

function* lock_process(sim, res){
    for (let i=0; i<10; i++) {
        console.log('Try lock ' + i + ' at time ' + sim.now());
        const req = res.request();
        yield req;
        console.log('Lock ' + i + ' at time ' + sim.now());
        yield sim.timeout(5);
        res.release(req);
        console.log('Unlock ' + i + ' at time ' + sim.now());
    }
}

function* lock_prio_process(sim, res){
    for (let i=0; i<10; i++) {
        using lock = res.request({priority: 1});
        console.log('Try lock prio ' + i + ' at time ' + sim.now());
        yield lock;
        console.log('Lock prio ' + i + ' at time ' + sim.now());
        yield sim.timeout(10);
        console.log('Unlock prio ' + i + ' at time ' + sim.now());
    }
}

sim.process(lock_prio_process(sim, res));
sim.process(lock_process(sim, res));

sim.run(600);

function* sender(sim, channel, message) {
    for (const word of message.split(' ')) {
        console.log(sim.now() + ': trying to send \'' + word + '\'');
        yield channel.put(word);
        console.log(sim.now() + ': sending \'' + word + '\' succeeded');
        yield sim.timeout(1);
    }
}

function* receiver(sim, channel) {
    while (true) {
        console.log(sim.now() + ': ready to receive');
        const word = yield channel.get();
        console.log(sim.now() + ': received \'' + word + '\'');
        yield sim.timeout(10);
    }
}

const channel = new Store(sim, 5);
sim.process(sender(sim, channel, 'Can we transmit this long message without being blocked?'));
sim.process(receiver(sim, channel));
sim.run(700);

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

const filterstore = new FilterStore(sim, 3);
sim.process(provide_letters(sim, filterstore, 'banana'));
sim.process(take_letters(sim, filterstore, 'naban'));
sim.run(800);

function* sleeping_beauty(sim) {
    console.log('I am tired')
    try {
        yield sim.timeout(Infinity);
    } catch (exc) {
        console.log('I am awoken by a ' + exc.cause.by);
    }
}

function* prince(sim, beauty) {
    yield sim.timeout(10);
    console.log('Let\'s kiss');
    yield beauty.interrupt({ by: 'prince' });
    console.log('Let\'s kiss again');
    try {
        yield beauty.interrupt();
    }
    catch(exc) {
        console.log('I am no longer asleep');
    }
}

const beauty = sim.process(sleeping_beauty(sim));
sim.process(prince(sim, beauty));
sim.run(900);

function* work(sim, res) {
    yield sim.timeout(5);
    let wait_time = 10;
    while (true) {
        using req = res.request();
        yield req;
        console.log('I have ' + wait_time + ' work at time ' + sim.now());
        try {
            yield sim.timeout(wait_time);
            console.log('I am finished at time ' + sim.now());
            wait_time = 10;
        } catch (exc) {
            if (exc.message === 'InterruptException') {
                wait_time -= sim.now() - exc.cause.usage_since;
                console.log('I am preempted at time ' + sim.now());
            }
        }
    }
}

function* important_work(sim, res) {
    while (true) {
        yield sim.timeout(2);
        using ev = res.request({ priority: 1, preempt: true });
        console.log('I am requested to do priority work at time ' + sim.now());
        yield ev;
        console.log('I am priority working at time ' + sim.now());
        yield sim.timeout(2);
        console.log('I am finished with priority work at time ' + sim.now());
    }
}
const worker = new Resource(sim, 1);
sim.process(work(sim, worker));
sim.process(important_work(sim, worker));
sim.run(940);


const NUM = 100000000;
let samples = new Float64Array(NUM);
let start = Date.now();
for (let i=0; i<NUM; i++) {
    samples[i] = getRandomGaussian(4, 3);
}
console.log(Date.now() - start);
let mean = samples.reduce((a,b) => a + b, 0) / NUM;
let variance = samples.map((a) => (a - mean) ** 2).reduce((a,b) => a + b, 0) / (NUM - 1);
console.log(mean, variance);

samples = new Float64Array(NUM);
start = Date.now();
for (let i=0; i<NUM; i++) {
    samples[i] = getRandomExponential(2);
}
console.log(Date.now() - start);
mean = samples.reduce((a,b) => a + b, 0) / NUM;
variance = samples.map((a) => (a - mean) ** 2).reduce((a,b) => a + b, 0) / (NUM - 1);
console.log(mean, variance);