import test from 'node:test';
import assert from 'node:assert/strict';

import { Simulation, FilterStore, Store, Resource } from '../index.js';
import { EventState } from '../modules/event.js';
import { ProcessState } from '../modules/process.js';
import { Condition } from '../modules/condition.js';


test('FilterStore initializes its load from provided items', () => {
  const sim = new Simulation();
  const items = new Map([['a', 2], ['b', 1]]);

  const store = new FilterStore(sim, 10, { items });

  assert.equal(store.load, 3);
  assert.equal(store.items.get('a'), 2);
});

test('Condition.check does not crash when a scheduled condition receives an error', () => {
  const sim = new Simulation();
  const ev1 = sim.event();
  const ev2 = sim.event();
  const cond = new Condition(sim, Condition.eval_and, ev1, ev2);
  cond.state = EventState.SCHEDULED;

  assert.doesNotThrow(() => Condition.check(ev1, cond));
});

test('Any-of keeps its successful result when another operand later fails', () => {
  const sim = new Simulation();
  const first = sim.event();
  const second = sim.event();
  let result;

  sim.process(function* () {
    result = yield sim.anyof(first, second);
  });

  first.succeed({ priority: -1, result: 'first' });
  second.fail(new Error('late failure'), { priority: -1 });
  sim.run(1);

  assert.equal(result[0], 'first');
  assert.match(result[1].message, /late failure/);
});

test('Process clears active_process when its generator throws', () => {
  const sim = new Simulation();
  sim.process(function* () {
    yield sim.timeout(0);
    throw new Error('boom');
  });

  assert.throws(() => sim.run(1), /boom/);
  assert.equal(sim.active_process, null);
});

test('Events cannot be scheduled more than once', () => {
  const sim = new Simulation();
  const event = sim.event();

  event.schedule();

  assert.throws(() => event.schedule(), /scheduled once/);
});

test('Processed events release their callbacks', () => {
  const sim = new Simulation();
  const event = sim.timeout(0);
  event.append_callback(() => {});

  sim.run(0);

  assert.equal(event.callbacks.length, 0);
});

test('Simulation rejects a deadline before the current time', () => {
  const sim = new Simulation(10);

  assert.throws(() => sim.run(5), /earlier than the current/);
  assert.equal(sim.now(), 10);
});

test('Store preserves FIFO order with indexed dequeues', () => {
  const sim = new Simulation();
  const store = new Store(sim, 2);
  const values = [];

  sim.process(function* () {
    yield store.put('a');
    yield store.put('b');
    values.push(yield store.get());
    values.push(yield store.get());
  });
  sim.run(1);

  assert.deepEqual(values, ['a', 'b']);
});

test('Interrupting a starting process does not fall through into the started path', () => {
  const sim = new Simulation();
  const proc = sim.process(function* (sim) {
    try {
      yield sim.timeout(1);
      return 'unexpected';
    } catch (err) {
      return err.cause.by;
    }
  });

  const interruptEvent = proc.interrupt({ by: 'boss' });
  assert.equal(interruptEvent.state, 1);
  sim.run(2);
  assert.equal(proc.state, 2);
});

test('Process lifecycle state is separate from event state', () => {
  const sim = new Simulation();
  const proc = sim.process(function* () {
    yield sim.timeout(0);
    return 'done';
  });

  sim.run(1);

  assert.equal(proc.state, ProcessState.STOPPED);
  assert.equal(proc.event_state, EventState.PROCESSED);
});

test('Simulation rejects a stopping event from another simulation', () => {
  const sim = new Simulation();
  const other = new Simulation();

  assert.throws(() => sim.run(other.timeout(1)), /different simulation/);
});

test('Conditions reject operands from another simulation', () => {
  const sim = new Simulation();
  const other = new Simulation();

  assert.throws(() => sim.anyof(sim.event(), other.event()), /same simulation/);
});

test('Processes reject events from another simulation', () => {
  const sim = new Simulation();
  const other = new Simulation();
  sim.process(function* () {
    yield other.timeout(1);
  });

  assert.throws(() => sim.run(1), /same simulation/);
});

test('Resource preemption rejects processless requests clearly', () => {
  const sim = new Simulation();
  const resource = new Resource(sim, 1);

  resource.request();

  assert.throws(() => resource.request({ priority: 1, preempt: true }), /process-owned/);
});

test('Invalid process yields do not update waiting_for', () => {
  const sim = new Simulation();
  const proc = sim.process(function* () {
    yield 42;
  });

  assert.throws(() => sim.run(0), /wait for an event/);
  assert.equal(proc.waiting_for, null);
  assert.equal(proc.process_state, ProcessState.FAILED);
});

test('Resource release rejects requests from another resource', () => {
  const sim = new Simulation();
  const first = new Resource(sim, 1);
  const second = new Resource(sim, 1);
  const request = first.request();

  assert.throws(() => second.release(request), /does not belong/);
});

test('All-of with no operands succeeds immediately', () => {
  const sim = new Simulation();
  let result;

  sim.process(function* () {
    result = yield sim.allof();
  });
  sim.run(1);

  assert.deepEqual(result, []);
});

test('Any-of with no operands succeeds immediately', () => {
  const sim = new Simulation();
  let result;

  sim.process(function* () {
    result = yield sim.anyof();
  });
  sim.run(1);

  assert.deepEqual(result, []);
});

test('Starting interruptions preserve the complete cause', () => {
  const sim = new Simulation();
  const cause = { by: 'boss', resource: 'machine' };
  let received;
  const proc = sim.process(function* () {
    try {
      yield sim.timeout(1);
    } catch (error) {
      received = error.cause;
    }
  });

  proc.interrupt(cause);
  sim.run(1);

  assert.deepEqual(received, cause);
});
