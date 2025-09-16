export { EventState, Event };

const EventState = {
    IDLE: 0,
    SCHEDULED: 1,
    PROCESSED: 2
};

class Event {
    id;
    callbacks = [];
    state = EventState.IDLE;
    result;
    scheduled_time = null;
    priority;
    constructor(id) {
        this.id = id;
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
        const cb = (sim) => func(sim, this, ...args)
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

    toString() {
        return 'Event ' + this.id;
    }
}