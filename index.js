export { Simulation, Resource, Container, Store, FilterStore, EventState };

import { Heap } from './modules/heap.js';
import { Event, EventState} from './modules/event.js';
import { Condition } from './modules/condition.js';
import { Process, ProcessState } from './modules/process.js';
import { AbstractResource } from './modules/abstract_resource.js';
import { ResourcePut, ResourcePreemptPut, ResourceGet } from './modules/resource.js';
import { ContainerPut, ContainerGet } from './modules/container.js';
import { StorePut, StoreGet } from './modules/store.js';
import { FilterStorePut, FilterStoreGet } from './modules/filterstore.js';

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

    run(until=Infinity) {
        if (typeof(until) === 'number') {
            var ev = this.timeout(until - this.clock);
        } else if (until instanceof Event) {
            var ev = until;
        } else {
            throw new Error('The argument until has to be a Number or an Event.');
        }
        ev.append_callback(Simulation.stop);
        try {
            while (true) {
                this.#step();
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

    #step() {
        if (this.heap.isempty()) {
            throw new Error('Empty schedule');
        }
        const ev = this.heap.pop();
        //console.log(ev.toString());
        ev.state = EventState.PROCESSED;
        this.clock = ev.scheduled_time;
        for (const cb of ev.callbacks) {
            cb();
        }
    }

    event() {
        return new Event(this);
    }

    timeout(delay, {priority=0, result=null}={}) {
        return this.event().schedule(delay, {priority: priority, result: result});
    }

    and(ev1, ev2) {
        return new Condition(this, Condition.eval_and, ev1, ev2);
    }

    or(ev1, ev2) {
        return new Condition(this, Condition.eval_or, ev1, ev2);
    }

    allof(...events) {
        return new Condition(this, Condition.eval_and, ...events);
    }

    anyof(...events) {
        return new Condition(this, Condition.eval_or, ...events);
    }

    process(generator) {
        return new Process(this, generator);
    }

    static stop(_) {
        throw new Error("Stop Simulation");
    }
}

class Resource extends AbstractResource {
    users = new Set();

    constructor(sim, capacity=1) {
        super(sim, capacity);
    }

    request({priority=0, preempt=false}={}) {
        if (preempt) {
            var ev = new ResourcePreemptPut(this.sim, this, priority);
        } else {
            var ev = new ResourcePut(this.sim, this, priority);
        }
        this.put_queue.push(ev);
        ev.append_callback(AbstractResource.trigger_get, this);
        AbstractResource.trigger_put(ev, this);
        return ev;
    }

    release(req, {priority=0}={}) {
        const ev = new ResourceGet(this.sim, req, priority);
        this.get_queue.push(ev);
        ev.append_callback(AbstractResource.trigger_put, this);
        AbstractResource.trigger_get(ev, this);
        return ev;
    }
}

class Container extends AbstractResource {
    level;

    constructor(sim, capacity, {level=0}={}) {
        super(sim, capacity);
        this.level = level;
    }

    put(amount, {priority=0}={}) {
        const ev = new ContainerPut(this.sim, amount, priority);
        this.put_queue.push(ev);
        ev.append_callback(AbstractResource.trigger_get, this);
        AbstractResource.trigger_put(ev, this);
        return ev;
    }

    get(amount, {priority=0}={}) {
        const ev = new ContainerGet(this.sim, amount, priority);
        this.get_queue.push(ev);
        ev.append_callback(AbstractResource.trigger_put, this);
        AbstractResource.trigger_get(ev, this);
        return ev;
    }
}

class Store extends AbstractResource {
    items;

    constructor(sim, capacity=Infinity, {items=[]}={}) {
        super(sim, capacity);
        this.items = items;
    }

    put(item, {priority=0}={}) {
        const ev = new StorePut(this.sim, item, priority);
        this.put_queue.push(ev);
        ev.append_callback(AbstractResource.trigger_get, this);
        AbstractResource.trigger_put(ev, this);
        return ev;
    }

    get({priority=0}={}) {
        const ev = new StoreGet(this.sim, priority);
        this.get_queue.push(ev);
        ev.append_callback(AbstractResource.trigger_put, this);
        AbstractResource.trigger_get(ev, this);
        return ev;
    }
}

class FilterStore extends Store {
    load;

    constructor(sim, capacity=Infinity, {items=new Map()}={}) {
        super(sim, capacity, {items: items});
        this.load = items.values().reduce((a, b) => a + b, 0);
    }

    put(item, {priority=0}={}) {
        const ev = new FilterStorePut(this.sim, item, priority);
        this.put_queue.push(ev);
        ev.append_callback(AbstractResource.trigger_get, this);
        AbstractResource.trigger_put(ev, this);
        return ev;
    }

    get(func, {priority=0}={}) {
        const ev = new FilterStoreGet(this.sim, func, priority);
        this.get_queue.push(ev);
        ev.append_callback(AbstractResource.trigger_put, this);
        AbstractResource.trigger_get(ev, this);
        return ev;
    }
}