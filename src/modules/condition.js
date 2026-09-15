export { Condition };

import { Event, EventState } from './event.js';
import { InvalidEventError } from '../errors.js';

class Condition extends Event {
    operand;
    events;
    operand_callbacks = [];
    constructor(sim, operand, ...events) {
        super(sim);
        this.operand = operand;
        this.events = events;
        for (const ev of events) {
            if (ev.sim !== sim) {
                throw new InvalidEventError('Condition operands must belong to the same simulation.');
            }
            this.operand_callbacks.push({ event: ev, callback: ev.append_callback(Condition.check, this) });
        }
        if (events.length === 0) {
            this.schedule(0, { result: [] });
        }
    }

    toString() {
        return 'Condition ' + this.id;
    }

    static check(ev, op) {
        if (op.event_state !== EventState.IDLE) {
            return;
        }

        if (ev.result instanceof Error) {
            op.detach_callbacks(ev);
            op.schedule(0, { result: ev.result });
            return;
        }
        if (op.operand(op.events)) {
            op.detach_callbacks(ev);
            op.schedule(0, { result: op.events.map((event) => event.result) });
        }
    }

    detach_callbacks(except=null) {
        for (const entry of this.operand_callbacks) {
            if (entry.event !== except) {
                entry.event.remove_callback(entry.callback);
            }
        }
        this.operand_callbacks = [];
    }

    static eval_and(events) {
        return events.map((ev) => ev.event_state === EventState.PROCESSED).reduce((st1, st2) => st1 && st2, true);
    }

    static eval_or(events) {
        return events.map((ev) => ev.event_state === EventState.PROCESSED).reduce((st1, st2) => st1 || st2, false);
    }
}