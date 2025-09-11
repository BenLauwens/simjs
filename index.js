import { Heap } from "./modules/heap.js";

class Simulation {
    clock;
    eid = 0;
    schedule = new Heap(Event.isless);
    active_process = null;

    constructor(clock=0) {
        this.clock = clock;
    }

    now() {
        return this.clock;
    }

    schedule_event(ev) {
        this.schedule.push(ev);
    }

    run(until=Infinity) {
        if (typeof(until) === 'number') {
            let ev = timeout(this, until - this.clock);
            ev.append_callback(stop_simulation);
        } else if (until instanceof Event) {
            until.append_callback(stop_simulation);
        } else {
            throw new Error('the argument until has to be a Number or an Event');
        }
        try {
            while (true) {
                this.step();
            }
        } catch (err) {
            switch(err.message) {
                case 'Stop Simulation':
                    break;
                case 'Empty Schedule':
                    console.log(err.message);
                    break;
                default:
                    throw err;
            }
        }
    }

    step() {
        if (this.schedule.isempty()) {
            throw new Error('Empty schedule');
        }
        const ev = this.schedule.pop();
        ev.state = EventState.PROCESSED;
        this.clock = ev.scheduled_time;
        console.debug('Event ' + ev.eid + ' at time ' + this.clock);
        for (const cb of ev.callbacks) {
            cb(ev);
        }
    }

    set_active_process(proc) {
        this.active_process = proc;
    }

    reset_active_process() {
        this.active_process = null;
    }
}

const EventState = {
    IDLE: 0,
    SCHEDULED: 1,
    PROCESSED: 2
};

class Event {
    sim;
    eid;
    callbacks = [];
    state = EventState.IDLE;
    result;
    scheduled_time = null;
    priority;
    constructor(sim) {
        this.sim = sim;
        this.eid = ++sim.eid;
    }

    static isless(ev1, ev2) {
        if (ev1.scheduled_time < ev2.scheduled_time) {
            return true;
        } else if (ev1.scheduled_time > ev2.scheduled_time) {
            return false;
        } else if (ev1.priority > ev2.priority) {
            return true;
        } else if (ev1.priority < ev2.priority) {
            return false;
        } else if (ev1.eid < ev2.eid) {
            return true;
        } else {
            return false;
        }
    }

    append_callback(func, ...args) {
        const cb = (ev) => func(ev, ...args)
        this.callbacks.push(cb);
        return cb;
    }

    remove_callback(cb) {
        for (let i=0; i<this.callbacks.length; i++) {
            if (cb === this.callbacks[i]) {
                this.callbacks.splice(i, 1);
                break;
            }
        }
    }

    schedule(delay = 0, priority = 0, result = null) {
        this.scheduled_time = this.sim.now() + delay;
        this.priority = priority;
        this.state = EventState.SCHEDULED;
        this.result = result;
        this.sim.schedule_event(this);
    }
}

function timeout(sim, delay, priority=0, result=null){
    const ev = new Event(sim);
    ev.schedule(delay, priority, result);
    return ev;
}

function succeed(ev, priority=0, result=null) {
    ev.schedule(0, priority, result);
    return ev;
}

function fail(ev, exc, priority=0) {
    return succeed(ev, priority, exc);
}

function initialize(sim) {
    return timeout(sim, 0);
}

function stop_simulation(ev) {
    throw new Error("Stop Simulation");
}

class Operator extends Event {
    operand;
    state_results = new Map();
    constructor(operand, ...events) {
        super(events[0].sim);
        this.operand = operand;
        
    }

    static check(ev, op) {

    }
}

class Process extends Event {
    generator;
    target_ev;
    resume_cb;

    constructor(func, sim, ...args) {
        super(sim);
        this.generator = func(sim, ...args);
        this.target_ev = initialize(sim);
        this.resume_cb = this.target_ev.append_callback(Process.execute, this);
    }

    static execute(ev, proc) {
        ev.sim.set_active_process(proc);
        const ret = ev.result instanceof Error ? proc.generator.throw(ev.result) : proc.generator.next(ev.result);
        ev.sim.reset_active_process();
        if (ret.done) {
            proc.schedule(0, 0, ret.value);
        } else {
            proc.target_ev = ret.value.state === EventState.PROCESSED ? timeout(sim, 0, 0, ret.value.result) : ret.value;
            proc.resume_cb = proc.target_ev.append_callback(Process.execute, proc);
        }
    }
}

const sim = new Simulation();

function* my_process(sim){
    yield succeed(new Event(sim));
    console.log('Step 1 at time ' + sim.now());
    yield timeout(sim, 1);
    console.log('Step 2 at time ' + sim.now());
    yield timeout(sim, 1);
    console.log('Step 3 at time ' + sim.now());
    try {
        yield fail(new Event(sim), Error('Failed Event'));
    } catch {
        console.log('Recovered from error at time ' + sim.now());
    }
    return 150;
}

function log(ev) {
    console.log('Process stopped with value ' + ev.result);
}

const proc = new Process(my_process, sim);
const cb = proc.append_callback(log);
proc.remove_callback(cb);
sim.run(timeout(sim, 158));