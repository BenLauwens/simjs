export { Process, ProcessState };

import { Event, EventState } from './event.js';

const ProcessState = {
    STARTING: 0,
    STARTED: 1,
    STOPPED: 2
};

class Process extends Event {
    state = ProcessState.STARTING;
    generator;
    target_ev;
    resume_cb;

    constructor(sim, generator) {
        super(sim);
        this.generator = generator;
        this.target_ev = sim.timeout(0);
        this.target_ev.append_callback((_, proc) => proc.state = ProcessState.STARTED, this);
        this.resume_cb = this.target_ev.append_callback(Process.execute, this);
    }

    toString() {
        return 'Process ' + this.id;
    }

    static execute(ev, proc) {
        ev.sim.set_active_process(proc);
        const ret = ev.result instanceof Error ? proc.generator.throw(ev.result) : proc.generator.next(ev.result);
        ev.sim.reset_active_process();
        if (ret.done) {
            proc.state = ProcessState.STOPPED;
            proc.schedule(0, {result: ret.value});
        } else {
            proc.target_ev = ret.value.state === EventState.PROCESSED ? ev.sim.timeout(0, {result: ret.value.result}) : ret.value;
            proc.resume_cb = proc.target_ev.append_callback(Process.execute, proc);
        }
    }
}