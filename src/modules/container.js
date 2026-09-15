export { ContainerPut, ContainerGet };

import { AbstractResourceEvent, ResourceDispatchResult } from './abstract_resource.js';
import { ResourceError } from '../errors.js';

class ContainerEvent extends AbstractResourceEvent {
    amount;

    constructor(sim, amount=1, priority=0) {
        super(sim, priority);
        this.amount = amount;
    }
}

class ContainerPut extends ContainerEvent {
    constructor(sim, amount=1, priority=0) {
        if (!Number.isFinite(amount) || amount < 0) {
            throw new ResourceError('Container amount must be a non-negative number.');
        }
        super(sim, amount, priority);
    }

    do(con) {
        if (con.level + this.amount > con.capacity) {
            return ResourceDispatchResult.BLOCKED;
        }
        con.level += this.amount;
        this.schedule();
        return ResourceDispatchResult.CONTINUE;
    }
}

class ContainerGet extends ContainerEvent {
    constructor(sim, amount=1, priority=0) {
        if (!Number.isFinite(amount) || amount < 0) {
            throw new ResourceError('Container amount must be a non-negative number.');
        }
        super(sim, amount, priority);
    }

    do(con) {
        if (con.level - this.amount < 0) {
            return ResourceDispatchResult.BLOCKED;
        }
        con.level -= this.amount;
        this.schedule();
        return ResourceDispatchResult.CONTINUE;
    }
}

