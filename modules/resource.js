export { AbstractResource };

import { Heap } from './heap.js';
import { Event } from './event.js';

class AbstractResource {
    sim;
    capacity;
    put_queue = new Heap(Event.isless);
    get_queue = new Heap(Event.isless);

    constructor(sim, capacity) {
        this.sim = sim;
        this.capacity = capacity;
    }

    static trigger_put(_, __, res) {
        while (! res.put_queue.isempty()) {
            const put_ev = res.put_queue.first();
            if (put_ev.do(res)) {
                res.put_queue.pop();
            } else {
                break;
            }
        }
    }

    static trigger_get(_, __, res) {
        while (! res.get_queue.isempty()) {
            const get_ev = res.get_queue.first();
            if (get_ev.do(res)) {
                res.get_queue.pop();
            } else {
                break;
            }
        }
    }
}