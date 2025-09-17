export { Process };

import { Event, EventState } from './event.js';

class Process extends Event {
    generator;
    target_ev;
    resume_cb;

    constructor(id, generator, sim) {//func, sim, ...args) {
        super(id);
        /*if (func instanceof Function) {
            this.generator = func(sim, ...args);
        } else {
            this.generator = args[0].call(func, sim, ...args.splice(1));
        }*/
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
            const value = ret.value instanceof Event ? ret.value : ret.value.ev // allow automatic resource management
            proc.target_ev = value.state === EventState.PROCESSED ? sim.timeout(0, {result: value.result}) : value;
            proc.resume_cb = proc.target_ev.append_callback(Process.execute, proc);
        }
    }
}