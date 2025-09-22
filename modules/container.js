export { ContainerPut, ContainerGet };

import { AbstractResourceEvent } from './abstract_resource.js';

class ContainerEvent extends AbstractResourceEvent {
    amount;

    constructor(sim, amount=1, priority=0) {
        super(sim, priority);
        this.amount = amount;
    }
}

class ContainerPut extends ContainerEvent {
    constructor(sim, amount=1, priority=0) {
        super(sim, amount, priority);
    }

    do(con) {
        if (con.level + this.amount > con.capacity) {
            return false;
        }
        con.level += this.amount;
        this.schedule();
        return true;
    }
}

class ContainerGet extends ContainerEvent {
    constructor(sim, amount=1, priority=0) {
        super(sim, amount, priority);
    }

    do(con) {
        if (con.level - this.amount < 0) {
            return false;
        }
        con.level -= this.amount;
        this.schedule();
        return true;
    }
}

