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

    interrupt(cause=null) {
        if (this === this.sim.active_process) {
            throw new Error('A process cannot interrupts itself.');
        }
        switch (this.state) {
            case ProcessState.STARTING:
                this.target_ev.schedule(0, { priority: Infinity });
            case ProcessState.STARTED:
                const err = new Error('InterruptException', { cause: cause });
                const ev = this.sim.timeout(0, { priority: Infinity, result: err });
                ev.append_callback(Process.interruption, this);
                break;
            case ProcessState.STOPPED:
                throw new Error('A stopped process cannot be interrupted.');
        }
        return this.sim.timeout(0);
    }

    static interruption(ev, proc) {
        if (proc.state === ProcessState.STARTED) {
            proc.target_ev.remove_callback(proc.resume_cb);
            Process.execute(ev, proc);
        }
    }

    static execute(ev, proc) {
        ev.sim.active_process = proc;
        const ret = ev.result instanceof Error ? proc.generator.throw(ev.result) : proc.generator.next(ev.result);
        ev.sim.active_process = null;
        if (ret.done) {
            proc.state = ProcessState.STOPPED;
            proc.schedule(0, {result: ret.value});
        } else {
            proc.target_ev = ret.value.state === EventState.PROCESSED ? ev.sim.timeout(0, {result: ret.value.result}) : ret.value;
            proc.resume_cb = proc.target_ev.append_callback(Process.execute, proc);
        }
    }
}