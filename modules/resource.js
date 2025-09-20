export { ResourcePut, ResourcePreemptPut, ResourceGet };

import { Event } from './event.js';

class ResourcePut extends Event {
    res;
    proc;
    usage_since;

    constructor(sim, res, priority=0) {
        super(sim);
        this.priority = priority;
        this.res = res;
        this.proc = this.sim.active_process;
    }

    do(res) {
        if (res.users.size < res.capacity) {
            res.users.add(this);
            this.usage_since = this.sim.now();
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

class ResourcePreemptPut extends ResourcePut {
    constructor(sim, res, priority=0) {
        super(sim, res, priority);
    }

    do(res) {
        if (res.users.size === res.capacity) {
            const preempt = res.users.keys().reduce((a, b) => Event.isless(a,b) ? b : a, { priority: Infinity });
            if (Event.isless(this, preempt)) {
                res.users.delete(preempt);
                preempt.proc.interrupt({ by: this.sim.active_process, usage_since: preempt.usage_since, resource: res });
            }
        }
        return super.do(res);
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

