export { Condition };

import { Event, EventState } from './event.js';

class Condition extends Event {
    operand;
    events;
    constructor(sim, operand, ...events) {
        super(sim);
        this.operand = operand;
        this.events = events;
        for (const ev of events) {
            ev.append_callback(Condition.check, this);
        }
    }

    toString() {
        return 'Condition ' + this.id;
    }

    static check(ev, op) {
        if (op.state === EventState.IDLE) {
            if (ev.result instanceof Error) {
                op.schedule(0, {result: ev.result});
            } else {
                if (op.operand(op.events)) {
                    op.schedule(0, {result: op.events.map((ev) => ev.result)});
                }
            }
        } else if (op.state === EventState.SCHEDULED) {
            if (ev.result instanceof Error) {
                op.schedule(0, {priority: infinity, result: ev.result});
            } else {
                op.state_results.set(ev, [ev.state, ev.result]);
            }
        }
    }

    static eval_and(events) {
        return events.map((ev) => ev.state === EventState.PROCESSED).reduce((st1, st2) => st1 && st2, true);
    }

    static eval_or(events) {
        return events.map((ev) => ev.state === EventState.PROCESSED).reduce((st1, st2) => st1 || st2, false);
    }
}