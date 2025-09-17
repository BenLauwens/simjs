export { Condition };

import { Event, EventState } from './event.js';

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

    toString() {
        return 'Condition ' + this.id;
    }

    static check(sim, ev, op) {
        if (op.state === EventState.IDLE) {
            if (ev.result instanceof Error) {
                sim.schedule(op, 0, {result: ev.result});
            } else {
                op.state_results.set(ev, [ev.state, ev.result]);
                if (op.operand(op.state_results.values())) {
                    sim.schedule(op, 0, {result: op.state_results});
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

    static eval_and(state_results) {
        return state_results.map((sr) => sr[0] === EventState.PROCESSED).reduce((s1, s2) => s1 && s2, true);
    }

    static eval_or(state_results) {
        return state_results.map((sr) => sr[0] === EventState.PROCESSED).reduce((sr1, sr2) => sr1 || sr2, false);
    }
}