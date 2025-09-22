export { ResourcePut, ResourcePreemptPut, ResourceGet };

import { AbstractResourceEvent } from './abstract_resource.js';

class ResourcePut extends AbstractResourceEvent {
    res;
    proc;
    usage_since;

    constructor(sim, res, priority=0) {
        super(sim, priority);
        this.res = res;
        this.proc = this.sim.active_process;
    }

    do(res) {
        if (res.users.size < res.capacity) {
            res.users.add(this);
            this.usage_since = this.sim.now();
            this.schedule(0, { priority: this.priority });
        }
        return false;
    }

    [Symbol.dispose]() {
        this.res.release(this, {priority: this.priority});
    }
}

class ResourcePreemptPut extends ResourcePut {
    constructor(sim, res, priority=0) {
        super(sim, res, priority);
    }

    do(res) {
        if (res.users.size === res.capacity) {
            const preempt = res.users.keys().reduce((a, b) => AbstractResourceEvent.isless(a,b) ? b : a, { priority: Infinity });
            if (AbstractResourceEvent.isless(this, preempt)) {
                res.users.delete(preempt);
                preempt.proc.interrupt({ by: this.sim.active_process, usage_since: preempt.usage_since, resource: res });
            }
        }
        return super.do(res);
    }
}

class ResourceGet extends AbstractResourceEvent {
    req;

    constructor(sim, req, priority=0) {
        super(sim, priority);
        this.req = req;
    }

    do(res) {
        res.users.delete(this.req);
        this.schedule(0, { priority: this.priority });
        return false;
    }
}

