export { Simulation, Resource, Container, EventState };

import { Heap } from './modules/heap.js';
import { Event, EventState} from './modules/event.js';
import { Condition } from './modules/condition.js';
import { Process } from './modules/process.js';
import { Put, Get } from './modules/container.js';
import { AbstractResource } from './modules/resource.js';

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

    schedule(ev, delay=0, {priority=0, result=null}={}) {
        ev.scheduled_time = this.now() + delay;
        ev.priority = priority;
        ev.state = EventState.SCHEDULED;
        ev.result = result;
        this.heap.push(ev);
    }

    run(until=Infinity) {
        if (typeof(until) === 'number') {
            var ev = this.timeout(until - this.clock);
        } else if (until instanceof Event) {
            var ev = until;
        } else {
            throw new Error('the argument until has to be a Number or an Event');
        }
        ev.append_callback(Simulation.stop);
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
        //console.log(ev + ' at time ' + this.now());
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

    timeout(delay, {priority=0, result=null}={}) {
        const ev = this.event();
        this.schedule(ev, delay, {priority: priority, result: result});
        return ev;
    }

    succeed(ev, {priority=0, result=null}={}) {
        this.schedule(ev, 0, {priority: priority, result: result});
        return ev;
    }

    fail(ev, exc, {priority=0}={}) {
        return this.succeed(ev, {priority: priority, result: exc});
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

    process(func_or_obj, ...args) {
        if (func_or_obj instanceof Function) {
            var generator = func_or_obj(this, ...args);
        } else {
            var generator = args[0].call(func_or_obj, this, ...args.splice(1));
        }
        return new Process(++this.eid, generator, this);
    }

    put(con, amount, {priority=0}={}) {
        const ev = new Put(++this.eid, amount, priority);
        con.put_queue.push(ev);
        ev.append_callback(AbstractResource.trigger_get, con);
        AbstractResource.trigger_put(this, ev, con);
        return ev;
    }

    lock(res, {priority=0}={}) {
        const ev = this.put(res, 1, {priority: priority});
        const sim = this;
        ev.release_lock = function() {
            sim.unlock(res, 1, {priority: priority});
        };
        return ev;
    }

    get(con, amount=1, {priority=0}={}) {
        const ev = new Get(++this.eid, amount, priority);
        con.get_queue.push(ev);
        ev.append_callback(AbstractResource.trigger_put, con);
        AbstractResource.trigger_get(this, ev, con);
        return ev;
    }

    unlock(res, {priority=0}={}) {
        return this.get(res, 1, {priority: priority});
    }

    static stop(_, __) {
        throw new Error("Stop Simulation");
    }
}

class Container extends AbstractResource {
    capacity;
    level;

    constructor(capacity, {level=0}={}) {
        super();
        this.capacity = capacity;
        this.level = level;
    }
}

const Resource = Container;