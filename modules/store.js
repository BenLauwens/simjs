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
        if (store.load < store.capacity) {
            store.load += 1;
            store.items.set(this.item, store.items.has(this.item) ? store.items.get(this.item) + 1 : 1);
            this.schedule();
        }
        return false;
    }

    toString() {
        return 'StorePut ' + this.id;
    }
}

class StoreGet extends Event {
    func;

    constructor(sim, func, priority=0) {
        super(sim);
        this.func = func;
        this.priority = priority;
    }

    do(store) {
        for (const [item, count] of store.items.entries()){
            if (this.func(item)) {
                store.load -= 1;
                if (count === 1) {
                    store.items.delete(item);
                } else {
                    store.items.set(item, count - 1);
                }
                this.schedule(0, {result: item});
                break;
            }
        }
        return false;
    }

    toString() {
        return 'StoreGet ' + this.id;
    }
}