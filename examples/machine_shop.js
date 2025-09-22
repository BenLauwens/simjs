import { Simulation, Resource } from '../index.js';
import { getRandomExponential, getRandomGaussian } from './utils.js';

const PT_MEAN = 10.0;
const PT_SIGMA = 2.0;
const MTTF = 300.0;
const BREAK_MEAN = 1 / MTTF;
const REPAIR_TIME = 30.0;
const JOB_DURATION = 30.0;
const NUM_MACHINES = 10;
const WEEKS = 4;
const SIM_TIME = WEEKS * 7 * 24 * 60;

function time_per_part() {
    let t = getRandomGaussian(PT_MEAN, PT_SIGMA);
    while (t <= 0) {
        t = getRandomGaussian(PT_MEAN, PT_SIGMA);
    }
    return t;
}

function time_to_failure() {
    return getRandomExponential(1 / BREAK_MEAN);
}

class Machine {
    sim;
    name;
    parts_made = 0;
    broken = false;
    process;

    constructor(sim, name, repairman) {
        this.sim = sim;
        this.name = name;
        this.process = sim.process(this.working(repairman));
        sim.process(this.break_machine())
    }

    * working(repairman) {
        while (true) {
            let done_in = time_per_part();
            while (done_in > 0) {
                const start = this.sim.now();
                try {
                    yield this.sim.timeout(done_in);
                } catch (exc) {
                    this.broken = true;
                    done_in -= this.sim.now - start;
                    using req = repairman.request({priority: 1, preempt: true});
                    //console.log('Ask repairman');
                    yield req;
                    //console.log('Got repairman');
                    yield this.sim.timeout(REPAIR_TIME);
                    this.broken = false;
                }
            }
            this.parts_made += 1;
        }
    }

    * break_machine() {
        while (true) {
            yield this.sim.timeout(time_to_failure());
            if (! this.broken ) {
                this.process.interrupt();
            }
        }
    }
}

function* other_jobs(sim, repairman) {
    while (true) {
        let done_in = JOB_DURATION;
        while (done_in > 0) {
            using req = repairman.request();
            yield req;
            try {
                yield sim.timeout(done_in);
                done_in = 0;
            } catch (exc) {
                done_in -= sim.now() - exc.cause.usage_since;
            }
        }
    }
}

const sim = new Simulation();
const repairman = new Resource(sim, 1);
const machines = [];
for (let i= 0; i<NUM_MACHINES; i++) {
    machines.push(new Machine(sim, 'Machine ' + i, repairman));
}

sim.process(other_jobs(sim, repairman));
sim.run(SIM_TIME);
console.log('Machine shop results after ' + WEEKS + ' weeks');
for (const machine of machines) {
    console.log(machine.name + ' made ' + machine.parts_made + ' parts.');
}