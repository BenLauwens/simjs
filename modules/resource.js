export { AbstractResource };

import { Heap } from './heap.js';
import { Event, EventState } from './event.js';

class AbstractResource {
    sim;
    capacity;
    put_queue = new Heap(Event.isless);
    get_queue = new Heap(Event.isless);

    constructor(sim, capacity) {
        this.sim = sim;
        this.capacity = capacity;
    }

    static trigger_put(_, res) {
        let proceed = true;
        while (! res.put_queue.isempty() && proceed) {
            const put_ev = res.put_queue.first();
            proceed = put_ev.do(res);
            if (put_ev.state === EventState.SCHEDULED) {
                res.put_queue.pop();
            } 
        }
    }

    static trigger_get(_, res) {
        let proceed = true;
        while (! res.get_queue.isempty() && proceed) {
            const get_ev = res.get_queue.first();
            proceed = get_ev.do(res);
            if (get_ev.state === EventState.SCHEDULED) {
                res.get_queue.pop();
            }
        }
    }
}