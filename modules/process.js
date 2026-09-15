export { Process, ProcessState };

import { Event, EventState } from './event.js';

const ProcessState = {
    STARTING: 0,
    STARTED: 1,
    STOPPED: 2,
    FAILED: 3
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
                this.pending_interrupt = { value: cause };
                break;
            case ProcessState.STARTED: {
                const err = new Error('InterruptException', { cause: cause });
                const ev = this.sim.timeout(0, { priority: Infinity, result: err });
                ev.append_callback(Process.interruption, this);
                break;
            }
            case ProcessState.STOPPED:
                throw new Error('A stopped process cannot be interrupted.');
            case ProcessState.FAILED:
                throw new Error('A failed process cannot be interrupted.');
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
        this.sim._set_active_process(this);
        let ret;
        try {
            ret = ev.result instanceof Error ? this.generator.throw(ev.result) : this.generator.next(ev.result);
        } finally {
            this.sim._set_active_process(null);
        }
        this.handle_result(ret);
    }

    handle_result(ret) {
        if (ret.done) {
            this.process_state = ProcessState.STOPPED;
            this.schedule(0, { result: ret.value });
            return;
        }

        const yielded = ret.value;
        if (!(yielded instanceof Event) || yielded.sim !== this.sim) {
            this.process_state = ProcessState.FAILED;
            this.waiting_for = null;
            this.target_ev = null;
            this.resume_cb = null;
            throw new Error('A process can only wait for an event from the same simulation.');
        }
        this.waiting_for = yielded;
        const next_ev = yielded.event_state === EventState.PROCESSED ? this.sim.timeout(0, { result: yielded.result }) : yielded;
        this.target_ev = next_ev;
        this.resume_cb = this.target_ev.append_callback(Process.execute, this);
    }

    start_with_interrupt(cause) {
        this.sim._set_active_process(this);
        try {
            const first = this.generator.next();
            if (first.done) {
                this.handle_result(first);
                return;
            }
            this.handle_result(this.generator.throw(new Error('InterruptException', { cause: cause })));
        } finally {
            this.sim._set_active_process(null);
        }
    }

    static execute(ev, proc) {
        if (proc.process_state === ProcessState.STARTING && proc.pending_interrupt !== null) {
            const cause = proc.pending_interrupt.value;
            proc.pending_interrupt = null;
            proc.process_state = ProcessState.STARTED;
            proc.start_with_interrupt(cause);
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