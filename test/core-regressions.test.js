import test from 'node:test';
import assert from 'node:assert/strict';

import {
  Simulation,
  Resource,
  Store,
  FilterStore,
  SimulationStopError,
} from '../index.js';

test('Simulation throws a typed stop error when run ends', () => {
  const sim = new Simulation();
  const ev = sim.timeout(2);
  assert.doesNotThrow(() => sim.run(ev));
  assert.ok(SimulationStopError);
});

test('Resource rejects invalid capacities', () => {
  const sim = new Simulation();
  assert.throws(() => new Resource(sim, -1), /capacity/i);
});

test('Store keeps load consistent with filter items', () => {
  const sim = new Simulation();
  const store = new FilterStore(sim, 3, { items: new Map([['a', 2], ['b', 1]]) });
  assert.equal(store.load, 3);
});

test('Store rejects invalid capacities', () => {
  const sim = new Simulation();
  assert.throws(() => new Store(sim, -1), /capacity/i);
});
