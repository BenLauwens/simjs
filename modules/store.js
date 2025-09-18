export { StorePut, StoreGet };

import { Event } from './event.js';

class StorePut extends Event {
    item;

    constructor(id, item, priority=0) {
        super(id);
        this.item = item;
        this.priority = priority;
    }

    do(sim, store) {
        if (store.items.size() === store.capacity) {
            return false;
        }
        sim.schedule(this);
        con.level += this.amount;
        return true;
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

    do(sim, store) {
        if (con.level - this.amount < 0) {
            return false;
        }
        sim.schedule(this);
        con.level -= this.amount;
        return true;
    }

    toString() {
        return 'StoreGet ' + this.id;
    }
}