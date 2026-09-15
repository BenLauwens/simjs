import test from 'node:test';
import assert from 'node:assert/strict';

import {
  Simulation,
  Resource,
  Container,
  Store,
  FilterStore,
  ResourceError,
} from '../index.js';

test('Container enforces capacity and updates its level', () => {
  const sim = new Simulation();
  const container = new Container(sim, 5, { level: 2 });
  let level;

  sim.process(function* () {
    yield container.put(3);
    yield container.get(4);
    level = container.level;
  });
  sim.run(1);

  assert.equal(level, 1);
});

test('Container wakes blocked puts when capacity becomes available', () => {
  const sim = new Simulation();
  const container = new Container(sim, 1);
  let put_completed = false;

  sim.process(function* () {
    yield container.put(1);
  });
  sim.process(function* () {
    yield container.put(1);
    put_completed = true;
  });
  sim.process(function* () {
    yield sim.timeout(1);
    yield container.get(1);
  });

  sim.run(2);

  assert.equal(put_completed, true);
  assert.equal(container.level, 1);
});

test('Store preserves FIFO order and blocks when full', () => {
  const sim = new Simulation();
  const store = new Store(sim, 1);
  const values = [];
  let second_put_completed = false;

  sim.process(function* () {
    yield store.put('first');
    yield store.put('second');
    second_put_completed = true;
  });
  sim.process(function* () {
    yield sim.timeout(1);
    values.push(yield store.get());
    yield sim.timeout(1);
    values.push(yield store.get());
  });

  sim.run(3);

  assert.equal(second_put_completed, true);
  assert.deepEqual(values, ['first', 'second']);
});

test('FilterStore returns the first matching item', () => {
  const sim = new Simulation();
  const store = new FilterStore(sim, 3);
  let value;

  sim.process(function* () {
    yield store.put('a');
    yield store.put('b');
    value = yield store.get((item) => item === 'b');
  });
  sim.run(1);

  assert.equal(value, 'b');
  assert.equal(store.load, 1);
  assert.equal(store.items.get('a'), 1);
});

test('FilterStore wakes a blocked matching get', () => {
  const sim = new Simulation();
  const store = new FilterStore(sim, 2);
  let value;

  sim.process(function* () {
    value = yield store.get((item) => item === 'target');
  });
  sim.process(function* () {
    yield sim.timeout(1);
    yield store.put('other');
    yield store.put('target');
  });

  sim.run(2);

  assert.equal(value, 'target');
  assert.equal(store.load, 1);
  assert.equal(store.items.get('other'), 1);
});

test('Resource grants simultaneous requests in deterministic order', () => {
  const sim = new Simulation();
  const resource = new Resource(sim, 1);
  const acquired = [];

  for (const name of ['first', 'second']) {
    sim.process(function* () {
      const request = resource.request();
      yield request;
      acquired.push(name);
      yield sim.timeout(1);
      yield resource.release(request);
    });
  }

  sim.run(3);

  assert.deepEqual(acquired, ['first', 'second']);
});

test('Resource validation errors are typed', () => {
  const sim = new Simulation();

  assert.throws(
    () => new Resource(sim, -1),
    (error) => error instanceof ResourceError
  );
});
