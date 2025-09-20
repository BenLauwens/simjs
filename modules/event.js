export { EventState, Event };

const EventState = {
    IDLE: 0,
    SCHEDULED: 1,
    PROCESSED: 2
};

class Event {
    sim;
    id;
    callbacks = [];
    state = EventState.IDLE;
    result;
    scheduled_time = null;
    priority;
    
    constructor(sim) {
        this.sim = sim;
        this.id = ++sim.eid;
    }

    static isless(ev1, ev2) {
        if (ev1.scheduled_time < ev2.scheduled_time) {
            return true;
        } else if (ev1.scheduled_time > ev2.scheduled_time) {
            return false;
        } else if (ev1.priority > ev2.priority) {
            return true;
        } else if (ev1.priority < ev2.priority) {
            return false;
        } else if (ev1.id < ev2.id) {
            return true;
        } else {
            return false;
        }
    }

    append_callback(func, ...args) {
        const cb = () => func(this, ...args)
        this.callbacks.push(cb);
        return cb;
    }

    remove_callback(cb) {
        for (let i=0; i<this.callbacks.length; i++) {
            if (cb === this.callbacks[i]) {
                this.callbacks.splice(i, 1);
                break;
            }
        }
    }

    schedule(delay=0, {priority=0, result=null}={}) {
        this.scheduled_time = this.sim.now() + delay;
        this.priority = priority;
        this.state = EventState.SCHEDULED;
        this.result = result;
        this.sim.heap.push(this);
        return this;
    }

    succeed({priority=0, result=null}={}) {
        return this.schedule(0, {priority: priority, result: result});
    }

    fail(exc, {priority=0}={}) {
        return this.succeed({priority: priority, result: exc});
    }

    toString() {
        return this.constructor.name + ' ' + this.id;
    }
}