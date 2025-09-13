export { EventState, Event, Condition, Process };

const EventState = {
    IDLE: 0,
    SCHEDULED: 1,
    PROCESSED: 2
};

class Event {
    eid;
    callbacks = [];
    state = EventState.IDLE;
    result;
    scheduled_time = null;
    priority;
    constructor(eid) {
        this.eid = eid;
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
        } else if (ev1.eid < ev2.eid) {
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
}

class Condition extends Event {
    operand;
    state_results = new Map();
    constructor(eid, operand, ...events) {
        super(eid);
        this.operand = operand;
        for (const ev of events) {
            this.state_results.set(ev, [ev.state, ev.result]);
            ev.append_callback(Condition.check, this);
        }
    }

    static check(sim, ev, op) {
        if (op.state === EventState.IDLE) {
            if (ev.result instanceof Error) {
                sim.schedule(op, 0, 0, ev.result);
            } else {
                op.state_results.set(ev, [ev.state, ev.result]);
                if (op.operand(op.state_results.values())) {
                    sim.schedule(op, 0, 0, op.state_results);
                }
            }
        } else if (op.state === EventState.SCHEDULED){
            if (ev.result instanceof Error) {
                sim.schedule(op, 0, infinity, ev.result);
            } else {
                op.state_results.set(ev, [ev.state, ev.result]);
            }
        }
    }

    static eval_and(state_results) {
        return state_results.map((sr) => sr[0] === EventState.PROCESSED).reduce((s1, s2) => s1 && s2, true);
    }

    static eval_or(state_results) {
        return state_results.map((sr) => sr[0] === EventState.PROCESSED).reduce((sr1, sr2) => sr1 || sr2, false);
    }
}

class Process extends Event {
    generator;
    target_ev;
    resume_cb;

    constructor(eid, func, sim, ...args) {
        super(eid);
        this.generator = func(sim, ...args);
        this.target_ev = sim.timeout(0);
        this.resume_cb = this.target_ev.append_callback(Process.execute, this);
    }

    static execute(sim, ev, proc) {
        sim.set_active_process(proc);
        const ret = ev.result instanceof Error ? proc.generator.throw(ev.result) : proc.generator.next(ev.result);
        sim.reset_active_process();
        if (ret.done) {
            sim.schedule(proc, 0, 0, ret.value);
        } else {
            proc.target_ev = ret.value.state === EventState.PROCESSED ? sim.timeout(0, 0, ret.value.result) : ret.value;
            proc.resume_cb = proc.target_ev.append_callback(Process.execute, proc);
        }
    }
}