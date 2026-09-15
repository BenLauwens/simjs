export { Process, ProcessState };

import { Event, EventState } from './event.js';

const ProcessState = {
    STARTING: 0,
    STARTED: 1,
    STOPPED: 2
};

function normalizeGenerator(generator, sim) {
    if (generator && typeof generator.next === 'function') {
        return generator;
    }
    if (typeof generator === 'function') {
        return generator(sim);
    }
    throw new Error('A process requires a generator object or a generator function.');
}

class Process extends Event {
    process_state = ProcessState.STARTING;
    generator;
    target_ev;
    resume_cb;
    waiting_for = null;
    pending_interrupt = null;

    get state() {
        return this.process_state;
    }

    set state(value) {
        this.process_state = value;
    }

    constructor(sim, generator) {
        super(sim);
        this.generator = normalizeGenerator(generator, sim);
        this.target_ev = sim.timeout(0);
        this.resume_cb = this.target_ev.append_callback(Process.execute, this);
    }

    interrupt(cause=null) {
        if (this === this.sim.active_process) {
            throw new Error('A process cannot interrupts itself.');
        }
        switch (this.process_state) {
            case ProcessState.STARTING:
                this.pending_interrupt = { by: cause && cause.by !== undefined ? cause.by : cause };
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
        if (proc.process_state !== ProcessState.STARTED) {
            return;
        }
        if (proc.resume_cb && proc.target_ev) {
            proc.target_ev.remove_callback(proc.resume_cb);
        }
        proc.resume(ev);
    }

    resume(ev) {
        if (!this.generator || typeof this.generator.next !== 'function') {
            throw new Error('Process generator is not initialized.');
        }
        this.sim.active_process = this;
        let ret;
        try {
            ret = ev.result instanceof Error ? this.generator.throw(ev.result) : this.generator.next(ev.result);
        } finally {
            this.sim.active_process = null;
        }
        if (ret.done) {
            this.process_state = ProcessState.STOPPED;
            this.schedule(0, { result: ret.value });
            return;
        }

        this.waiting_for = ret.value;
        if (!(ret.value instanceof Event) || ret.value.sim !== this.sim) {
            throw new Error('A process can only wait for an event from the same simulation.');
        }
        const next_ev = ret.value.event_state === EventState.PROCESSED ? this.sim.timeout(0, { result: ret.value.result }) : ret.value;
        this.target_ev = next_ev;
        this.resume_cb = this.target_ev.append_callback(Process.execute, this);
    }

    static execute(ev, proc) {
        if (proc.process_state === ProcessState.STARTING && proc.pending_interrupt !== null) {
            const cause = proc.pending_interrupt;
            proc.pending_interrupt = null;
            proc.process_state = ProcessState.STARTED;

            const first = proc.generator.next();
            if (first.done) {
                proc.process_state = ProcessState.STOPPED;
                proc.schedule(0, { result: first.value });
                return;
            }

            const err = new Error('InterruptException', { cause: cause });
            const ret = proc.generator.throw(err);
            if (ret.done) {
                proc.process_state = ProcessState.STOPPED;
                proc.schedule(0, { result: ret.value });
                return;
            }

            proc.waiting_for = ret.value;
            if (!(ret.value instanceof Event) || ret.value.sim !== proc.sim) {
                throw new Error('A process can only wait for an event from the same simulation.');
            }
            const next_ev = ret.value.event_state === EventState.PROCESSED ? proc.sim.timeout(0, { result: ret.value.result }) : ret.value;
            proc.target_ev = next_ev;
            proc.resume_cb = proc.target_ev.append_callback(Process.execute, proc);
            return;
        }

        if (proc.process_state === ProcessState.STARTED || proc.process_state === ProcessState.STARTING) {
            if (proc.process_state === ProcessState.STARTING) {
                proc.process_state = ProcessState.STARTED;
            }
            proc.resume(ev);
        }
    }
}