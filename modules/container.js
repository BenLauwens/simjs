export { ContainerPut, ContainerGet };

import { Event } from './event.js';

class ContainerEvent extends Event {
    amount;

    constructor(id, amount=1, priority=0) {
        super(id);
        this.amount = amount;
        this.priority = priority;
    }

    [Symbol.dispose]() {
        this.release_lock();
    }

}

class ContainerPut extends ContainerEvent {
    constructor(id, amount=1, priority=0) {
        super(id, amount, priority);
    }

    do(con) {
        if (con.level + this.amount > con.capacity) {
            return false;
        }
        con.level += this.amount;
        con.sim.schedule(this);
        return true;
    }

    toString() {
        return 'ContainerPut ' + this.id;
    }
}

class ContainerGet extends ContainerEvent {
    constructor(id, amount=1, priority=0) {
        super(id, amount, priority);
    }

    do(con) {
        if (con.level - this.amount < 0) {
            return false;
        }
        con.level -= this.amount;
        con.sim.schedule(this);
        return true;
    }

    toString() {
        return 'ContainerGet ' + this.id;
    }
}

