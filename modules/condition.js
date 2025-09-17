export { Condition };

import { Event, EventState } from './event.js';

class Condition extends Event {
    operand;
    events = new Set();
    constructor(eid, operand, ...events) {
        super(eid);
        this.operand = operand;
        for (const ev of events) {
            //this.state_results.set(ev, [ev.state, ev.result]);
            this.events.add(ev);
            ev.append_callback(Condition.check, this);
        }
    }

    toString() {
        return 'Condition ' + this.id;
    }

    static check(sim, ev, op) {
        if (op.state === EventState.IDLE) {
            if (ev.result instanceof Error) {
                sim.schedule(op, 0, {result: ev.result});
            } else {
                //op.state_results.set(ev, [ev.state, ev.result]);
                if (op.operand(op.events)) {
                    sim.schedule(op, 0, {result: op.events});
                }
            }
        } else if (op.state === EventState.SCHEDULED) {
            if (ev.result instanceof Error) {
                sim.schedule(op, 0, {priority: infinity, result: ev.result});
            } else {
                op.state_results.set(ev, [ev.state, ev.result]);
            }
        }
    }

    static eval_and(events) {
        return [...events].map((ev) => ev.state === EventState.PROCESSED).reduce((st1, st2) => st1 && st2, true);
    }

    static eval_or(events) {
        return [...events].map((ev) => ev.state === EventState.PROCESSED).reduce((st1, st2) => st1 || st2, false);
    }
}