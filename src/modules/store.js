export { StorePut, StoreGet };

import { AbstractResourceEvent, ResourceDispatchResult } from './abstract_resource.js';

class StorePut extends AbstractResourceEvent {
    item;

    constructor(sim, item, priority=0) {
        super(sim, priority);
        this.item = item;
    }

    do(store) {
        if (store.items.length - store.item_head < store.capacity) {
            store.items.push(this.item);
            this.schedule();
            return ResourceDispatchResult.CONTINUE;
        }
        return ResourceDispatchResult.BLOCKED;
    }
}

class StoreGet extends AbstractResourceEvent {

    constructor(sim, priority=0) {
        super(sim, priority);
    }

    do(store) {
        if (store.items.length > store.item_head) {
            const item = store.items[store.item_head++];
            if (store.item_head === store.items.length) {
                store.items.length = 0;
                store.item_head = 0;
            } else if (store.item_head >= 1024 && store.item_head * 2 >= store.items.length) {
                store.items.splice(0, store.item_head);
                store.item_head = 0;
            }
            this.schedule(0, {result: item});
        }
        return false;
    }
}