export { StorePut, StoreGet };

import { Event } from './event.js';

class StorePut extends Event {
    item;

    constructor(id, item, priority=0) {
        super(id);
        this.item = item;
        this.priority = priority;
    }

    do(store) {
        if (store.load < store.capacity) {
            store.load += 1;
            store.items.set(this.item, store.items.has(this.item) ? store.items.get(this.item) + 1 : 1);
            store.sim.schedule(this);
            return true;
        }
        return false;
    }

    toString() {
        return 'StorePut ' + this.id;
    }
}

class StoreGet extends Event {
    func;

    constructor(id, func, priority=0) {
        super(id);
        this.func = func;
        this.priority = priority;
    }

    do(store) {
        for (const [item, count] of store.items.entries()){
            console.log(item, this.func(item));
            if (this.func(item)) {
                store.load -= 1;
                if (count === 1) {
                    store.items.delete(item);
                } else {
                    store.items.set(item, count - 1);
                }
                store.sim.schedule(this, {result: item});
                return true;
            }
        }
        return false;
    }

    toString() {
        return 'StoreGet ' + this.id;
    }
}