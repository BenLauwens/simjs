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
            if (ev.sim !== sim) {
                throw new Error('Condition operands must belong to the same simulation.');
            }
            ev.append_callback(Condition.check, this);
        }
    }

    toString() {
        return 'Condition ' + this.id;
    }

    static check(ev, op) {
        if (op.event_state !== EventState.IDLE) {
            return;
        }

        if (op.event_state === EventState.IDLE) {
            if (ev.result instanceof Error) {
                op.schedule(0, { result: ev.result });
                return;
            }
            if (op.operand(op.events)) {
                op.schedule(0, { result: op.events.map((event) => event.result) });
            }
        }
    }

    static eval_and(events) {
        return events.map((ev) => ev.event_state === EventState.PROCESSED).reduce((st1, st2) => st1 && st2, true);
    }

    static eval_or(events) {
        return events.map((ev) => ev.event_state === EventState.PROCESSED).reduce((st1, st2) => st1 || st2, false);
    }
}