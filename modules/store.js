export { StorePut, StoreGet };

import { AbstractResourceEvent } from './abstract_resource.js';

class StorePut extends AbstractResourceEvent {
    item;

    constructor(sim, item, priority=0) {
        super(sim, priority);
        this.item = item;
    }

    do(store) {
        if (store.items.length < store.capacity) {
            store.items.push(this.item);
            this.schedule();
        }
        return false;
    }
}

class StoreGet extends AbstractResourceEvent {

    constructor(sim, priority=0) {
        super(sim, priority);
    }

    do(store) {
        if (store.items.length > 0) {
            const item = store.items.shift();
            this.schedule(0, {result: item});
        }
        return false;
    }
}