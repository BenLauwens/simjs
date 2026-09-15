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
    waiting_for = null;
    pending_interrupt = null;

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
                this.pending_interrupt = cause;
                this.target_ev.schedule(0, { priority: Infinity });
                break;
            case ProcessState.STARTED: {
                const err = new Error('InterruptException', { cause: cause });
                const ev = this.sim.timeout(0, { priority: Infinity, result: err });
                ev.append_callback(Process.interruption, this);
                break;
            }
            case ProcessState.STOPPED:
                throw new Error('A stopped process cannot be interrupted.');
        }
        return this.sim.timeout(0);
    }

    static interruption(ev, proc) {
        if (proc.state === ProcessState.STARTED) {
            proc.target_ev.remove_callback(proc.resume_cb);
            proc.resume(ev);
        }
    }

    resume(ev) {
        this.sim.active_process = this;
        const ret = ev.result instanceof Error ? this.generator.throw(ev.result) : this.generator.next(ev.result);
        this.sim.active_process = null;
        if (ret.done) {
            this.state = ProcessState.STOPPED;
            this.schedule(0, { result: ret.value });
        } else {
            this.waiting_for = ret.value;
            this.target_ev = ret.value.state === EventState.PROCESSED ? this.sim.timeout(0, { result: ret.value.result }) : ret.value;
            this.resume_cb = this.target_ev.append_callback(Process.execute, this);
        }
    }

    static execute(ev, proc) {
        if (proc.pending_interrupt !== null && proc.state === ProcessState.STARTING) {
            const cause = proc.pending_interrupt;
            proc.pending_interrupt = null;
            proc.target_ev.remove_callback(proc.resume_cb);
            proc.resume(ev);
            return;
        }
        proc.resume(ev);
    }
}