export { ContainerPut, ContainerGet };

import { Event } from './event.js';

class ContainerEvent extends Event {
    amount;

    constructor(sim, amount=1, priority=0) {
        super(sim);
        this.amount = amount;
        this.priority = priority;
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

