export { StorePut, StoreGet };

import { Event } from './event.js';

class StorePut extends Event {
    item;

    constructor(sim, item, priority=0) {
        super(sim);
        this.item = item;
        this.priority = priority;
    }

    do(store) {
        if (store.items.length < store.capacity) {
            store.items.push(this.item);
            this.schedule();
        }
        return false;
    }

    toString() {
        return 'StorePut ' + this.id;
    }
}

class StoreGet extends Event {

    constructor(sim, priority=0) {
        super(sim);
        this.priority = priority;
    }

    do(store) {
        if (store.items.length > 0) {
            const item = store.items.shift();
            this.schedule(0, {result: item});
        }
        return false;
    }

    toString() {
        return 'StoreGet ' + this.id;
    }
}