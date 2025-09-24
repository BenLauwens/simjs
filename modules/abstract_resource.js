export { AbstractResource, AbstractResourceEvent };

import { Heap } from './heap.js';
import { Event, EventState } from './event.js';

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
        this.sim = sim;
        this.capacity = capacity;
    }

    static trigger_put(_, res) {
        let proceed = true;
        while (! res.put_queue.isempty() && proceed) {
            const put_ev = res.put_queue.peek();
            proceed = put_ev.do(res);
            if (put_ev.state === EventState.SCHEDULED) {
                res.put_queue.pop();
            } 
        }
    }

    static trigger_get(_, res) {
        let proceed = true;
        while (! res.get_queue.isempty() && proceed) {
            const get_ev = res.get_queue.peek();
            proceed = get_ev.do(res);
            if (get_ev.state === EventState.SCHEDULED) {
                res.get_queue.pop();
            }
        }
    }
}