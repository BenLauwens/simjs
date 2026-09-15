export { AbstractResource, AbstractResourceEvent, ResourceDispatchResult };

import { Heap } from './heap.js';
import { Event, EventState } from './event.js';
import { ResourceError } from '../errors.js';

const ResourceDispatchResult = Object.freeze({
    BLOCKED: 'blocked',
    COMPLETED: 'completed',
    CONTINUE: 'continue'
});

class AbstractResourceEvent extends Event {

    constructor(sim, priority){
        super(sim);
        this.priority = priority;
    }

    static isless(ev1, ev2) {
        if (ev1.priority > ev2.priority) {
            return true;
        } else if (ev1.priority < ev2.priority) {
            return false;
        } else if (ev1.id < ev2.id) {
            return true;
        } else {
            return false;
        }
    }
}

class AbstractResource {
    sim;
    capacity;
    put_queue = new Heap(AbstractResourceEvent.isless);
    get_queue = new Heap(AbstractResourceEvent.isless);

    constructor(sim, capacity) {
        if (capacity === null || capacity === undefined || Number.isNaN(capacity)) {
            throw new ResourceError('Resource capacity must be a non-negative number or Infinity.');
        }
        if (capacity < 0 || (!Number.isFinite(capacity) && capacity !== Infinity)) {
            throw new ResourceError('Resource capacity must be a non-negative number or Infinity.');
        }
        this.sim = sim;
        this.capacity = capacity;
    }

    require_process() {
        if (this.sim.active_process === null) {
            throw new ResourceError('Resource operations must occur within a process.');
        }
    }

    dispatch_put() {
        let proceed = true;
        while (! this.put_queue.isempty() && proceed) {
            const put_ev = this.put_queue.peek();
            const outcome = put_ev.do(this);
            if (put_ev.event_state === EventState.SCHEDULED) {
                this.put_queue.pop();
            }
            proceed = outcome === ResourceDispatchResult.CONTINUE || outcome === true;
        }
    }

    dispatch_get() {
        let proceed = true;
        while (! this.get_queue.isempty() && proceed) {
            const get_ev = this.get_queue.peek();
            const outcome = get_ev.do(this);
            if (get_ev.event_state === EventState.SCHEDULED) {
                this.get_queue.pop();
            }
            proceed = outcome === ResourceDispatchResult.CONTINUE || outcome === true;
        }
    }

    static trigger_put(_, res) {
        res.dispatch_put();
    }

    static trigger_get(_, res) {
        res.dispatch_get();
    }
}