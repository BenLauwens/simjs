import test from 'node:test';
import assert from 'node:assert/strict';

import { Simulation, FilterStore } from '../index.js';
import { EventState } from '../modules/event.js';
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
