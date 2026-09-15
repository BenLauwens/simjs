export {
    Simulation,
    Resource,
    Container,
    Store,
    FilterStore,
    EventState,
    ProcessState,
    SimulationStopError,
    SimJSError,
    SimulationError,
    EmptyScheduleError,
    InvalidEventError,
    ProcessError,
    ResourceError,
    ResourceDispatchResult
};

import { Heap } from './modules/heap.js';
import { Event, EventState } from './modules/event.js';
import { Condition } from './modules/condition.js';
import { Process, ProcessState } from './modules/process.js';
import { AbstractResource, ResourceDispatchResult } from './modules/abstract_resource.js';
import { ResourcePut, ResourcePreemptPut, ResourceGet } from './modules/resource.js';
import { ContainerPut, ContainerGet } from './modules/container.js';
import { StorePut, StoreGet } from './modules/store.js';
import { FilterStorePut, FilterStoreGet } from './modules/filterstore.js';
import {
    SimJSError,
    SimulationError,
    EmptyScheduleError,
    InvalidEventError,
    ProcessError,
    ResourceError,
    SimulationStopError
} from './errors.js';

class Scheduler {
    #sim;

    constructor(sim) {
        this.#sim = sim;
    }

    step() {
        if (this.#sim._schedule_empty()) {
            throw new EmptyScheduleError('The simulation schedule is empty.');
        }
        const ev = this.#sim._pop_scheduled_event();
        ev.event_state = EventState.PROCESSED;
        this.#sim._advance_clock(ev.scheduled_time);
        try {
            this.#sim._notify_process(ev);
            for (const cb of ev.callbacks) {
                cb();
            }
        } catch (error) {
            this.#sim._notify_error(error, ev);
            throw error;
        } finally {
            ev.callbacks.length = 0;
        }
    }
}

class Simulation {
    #clock;
    #eid = 0;
    #heap = new Heap(Event.isless);
    #active_process = null;
    #scheduler;
    #hooks;

    constructor(clock=0, { onSchedule=null, onProcess=null, onError=null }={}) {
        this.#clock = clock;
        this.#scheduler = new Scheduler(this);
        this.#hooks = { onSchedule, onProcess, onError };
    }

    _advance_clock(time) {
        this.#clock = time;
    }

    _next_event_id() {
        return ++this.#eid;
    }

    _schedule_empty() {
        return this.#heap.isempty();
    }

    _pop_scheduled_event() {
        return this.#heap.pop();
    }

    _schedule(event) {
        if (event.sim !== this) {
            throw new InvalidEventError('An event belongs to a different simulation.');
        }
        this.#heap.push(event);
        this.#hooks.onSchedule?.(event);
    }

    _notify_process(event) {
        this.#hooks.onProcess?.(event);
    }

    _notify_error(error, event) {
        this.#hooks.onError?.(error, event);
    }

    _set_active_process(process) {
        this.#active_process = process;
    }

    get active_process() {
        return this.#active_process;
    }

    now() {
        return this.#clock;
    }

    run(until=Infinity) {
        let ev;
        if (typeof(until) === 'number') {
            if (!Number.isFinite(until) && until !== Infinity) {
                throw new SimulationError('The argument until must be a finite number or Infinity.');
            }
            if (until < this.#clock) {
                throw new SimulationError('The argument until cannot be earlier than the current simulation time.');
            }
            ev = this.timeout(until - this.#clock);
        } else if (until instanceof Event) {
            if (until.sim !== this) {
                throw new InvalidEventError('The stopping event belongs to a different simulation.');
            }
            if (until.event_state !== EventState.SCHEDULED) {
                throw new InvalidEventError('The stopping event must be scheduled.');
            }
            ev = until;
        } else {
            throw new SimulationError('The argument until has to be a Number or an Event.');
        }
        ev.append_callback(Simulation.stop);
        try {
            while (true) {
                this.#step();
            }
        } catch (err) {
            if (err instanceof SimulationStopError) {
                return;
            }
            throw err;
        }
    }

    #step() {
        return this.#scheduler.step();
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
        if (typeof generator === 'function') {
            return new Process(this, generator(this));
        }
        return new Process(this, generator);
    }

    static stop(_) {
        throw new SimulationStopError();
    }
}

class Resource extends AbstractResource {
    users = new Set();

    constructor(sim, capacity=1) {
        super(sim, capacity);
    }

    request({priority=0, preempt=false}={}) {
        this.require_process();
        let ev;
        if (preempt) {
            ev = new ResourcePreemptPut(this.sim, this, priority);
        } else {
            ev = new ResourcePut(this.sim, this, priority);
        }
        this.put_queue.push(ev);
        ev.append_callback(AbstractResource.trigger_get, this);
        AbstractResource.trigger_put(ev, this);
        return ev;
    }

    release(req, {priority=0}={}) {
        this.require_process();
        if (!(req instanceof ResourcePut) || req.res !== this) {
            throw new ResourceError('The request does not belong to this resource.');
        }
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
        this.require_process();
        const ev = new ContainerPut(this.sim, amount, priority);
        this.put_queue.push(ev);
        ev.append_callback(AbstractResource.trigger_get, this);
        AbstractResource.trigger_put(ev, this);
        return ev;
    }

    get(amount, {priority=0}={}) {
        this.require_process();
        const ev = new ContainerGet(this.sim, amount, priority);
        this.get_queue.push(ev);
        ev.append_callback(AbstractResource.trigger_put, this);
        AbstractResource.trigger_get(ev, this);
        return ev;
    }
}

class Store extends AbstractResource {
    items;
    item_head = 0;

    constructor(sim, capacity=Infinity, {items=[]}={}) {
        super(sim, capacity);
        this.items = items;
    }

    put(item, {priority=0}={}) {
        this.require_process();
        const ev = new StorePut(this.sim, item, priority);
        this.put_queue.push(ev);
        ev.append_callback(AbstractResource.trigger_get, this);
        AbstractResource.trigger_put(ev, this);
        return ev;
    }

    get({priority=0}={}) {
        this.require_process();
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
        this.load = Array.from(items.values()).reduce((a, b) => a + b, 0);
    }

    put(item, {priority=0}={}) {
        this.require_process();
        const ev = new FilterStorePut(this.sim, item, priority);
        this.put_queue.push(ev);
        ev.append_callback(AbstractResource.trigger_get, this);
        AbstractResource.trigger_put(ev, this);
        return ev;
    }

    get(func, {priority=0}={}) {
        this.require_process();
        const ev = new FilterStoreGet(this.sim, func, priority);
        this.get_queue.push(ev);
        ev.append_callback(AbstractResource.trigger_put, this);
        AbstractResource.trigger_get(ev, this);
        return ev;
    }
}