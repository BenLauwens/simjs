export { Simulation };

import { Heap } from "./modules/heap.js";
import { Event, EventState, Condition, Process } from "./modules/event.js";

class Simulation {
    clock;
    eid = 0;
    heap = new Heap(Event.isless);
    active_process = null;

    constructor(clock=0) {
        this.clock = clock;
    }

    now() {
        return this.clock;
    }

    schedule(ev, delay=0, priority=0, result=null) {
        ev.scheduled_time = this.now() + delay;
        ev.priority = priority;
        ev.state = EventState.SCHEDULED;
        ev.result = result;
        this.heap.push(ev);
    }

    run(until=Infinity) {
        if (typeof(until) === 'number') {
            let ev = this.timeout(until - this.clock);
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
                default:
                    throw err;
            }
        }
    }

    step() {
        if (this.heap.isempty()) {
            throw new Error('Empty schedule');
        }
        const ev = this.heap.pop();
        ev.state = EventState.PROCESSED;
        this.clock = ev.scheduled_time;
        for (const cb of ev.callbacks) {
            cb(this);
        }
    }

    set_active_process(proc) {
        this.active_process = proc;
    }

    reset_active_process() {
        this.active_process = null;
    }

    event() {
        return new Event(++this.eid);
    }

    timeout(delay, priority=0, result=null) {
        const ev = this.event();
        this.schedule(ev, delay, priority, result);
        return ev;
    }

    succeed(ev, priority=0, result=null) {
        this.schedule(ev, 0, priority, result);
        return ev;
    }

    fail(ev, exc, priority=0) {
        return this.succeed(ev, priority, exc);
    }

    and(ev1, ev2) {
        return new Condition(++this.eid, Condition.eval_and, ev1, ev2);
    }

    or(ev1, ev2) {
        return new Condition(++this.eid, Condition.eval_or, ev1, ev2);
    }

    allof(...events) {
        return new Condition(++this.eid, Condition.eval_and, ...events);
    }

    anyof(...events) {
        return new Condition(++this.eid, Condition.eval_or, ...events);
    }

    process(func, ...args) {
        return new Process(++this.eid, func, this, ...args);
    }
}

function stop_simulation(ev) {
    throw new Error("Stop Simulation");
}
