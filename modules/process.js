export { Process };

import { Event, EventState } from './event.js';

class Process extends Event {
    generator;
    target_ev;
    resume_cb;

    constructor(id, generator, sim) {
        super(id);
        this.generator = generator;
        this.target_ev = sim.timeout(0);
        this.resume_cb = this.target_ev.append_callback(Process.execute, this);
    }

    toString() {
        return 'Process ' + this.id;
    }

    static execute(sim, ev, proc) {
        sim.set_active_process(proc);
        const ret = ev.result instanceof Error ? proc.generator.throw(ev.result) : proc.generator.next(ev.result);
        sim.reset_active_process();
        if (ret.done) {
            sim.schedule(proc, 0, {result: ret.value});
        } else {
            proc.target_ev = ret.value.state === EventState.PROCESSED ? sim.timeout(0, {result: ret.value.result}) : ret.value;
            proc.resume_cb = proc.target_ev.append_callback(Process.execute, proc);
        }
    }
}