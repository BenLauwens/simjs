export { AbstractResource };

import { Heap } from './heap.js';
import { Event } from './event.js';

class AbstractResource {
    put_queue = new Heap(Event.isless);
    get_queue = new Heap(Event.isless);

    static trigger_put(sim, _, res) {
        while (! res.put_queue.isempty()) {
            const put_ev = res.put_queue.first();
            if (put_ev.do(sim, res)) {
                res.put_queue.pop();
            } else {
                break;
            }
        }
    }

    static trigger_get(sim, _, res) {
        while (! res.get_queue.isempty()) {
            const get_ev = res.get_queue.first();
            if (get_ev.do(sim, res)) {
                res.get_queue.pop();
            } else {
                break;
            }
        }
    }
}