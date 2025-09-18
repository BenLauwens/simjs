export { ResourcePut, ResourceGet };

import { Event } from './event.js';

class ResourcePut extends Event {
    res;

    constructor(sim, res, priority=0) {
        super(sim);
        this.priority = priority;
        this.res = res;
    }

    do(res) {
        if (res.users.size < res.capacity) {
            res.users.add(this);
            this.schedule();
        }
        return false;
    }

    [Symbol.dispose]() {
        this.res.release(this, {priority: this.priority});
    }

    toString() {
        return 'ResourcePut ' + this.id;
    }
}

class ResourceGet extends Event {
    req;

    constructor(sim, req, priority=0) {
        super(sim);
        this.req = req;
        this.priority = priority;
    }

    do(res) {
        res.users.delete(this.req);
        this.schedule();
        return false;
    }

    toString() {
        return 'ResourceGet ' + this.id;
    }
}

