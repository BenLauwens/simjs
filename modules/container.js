export { Put, Get };

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

class Put extends ContainerEvent {
    constructor(id, amount=1, priority=0) {
        super(id, amount, priority);
    }

    do(sim, con) {
        if (con.level + this.amount > con.capacity) {
            return false;
        }
        sim.schedule(this);
        con.level += this.amount;
        return true;
    }

    toString() {
        return 'Put ' + this.id;
    }
}

class Get extends ContainerEvent {
    constructor(id, amount=1, priority=0) {
        super(id, amount, priority);
    }

    do(sim, con) {
        if (con.level - this.amount < 0) {
            return false;
        }
        sim.schedule(this);
        con.level -= this.amount;
        return true;
    }

    toString() {
        return 'Get ' + this.id;
    }
}

