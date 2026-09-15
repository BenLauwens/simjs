# SimJS

A lightweight process-based discrete-event simulation library for JavaScript.

SimJS models systems as processes that yield events, such as timeouts, resource requests, or condition waits. The simulator advances a global clock by scheduling and processing events in priority order.

This project is intentionally small and readable, making it useful for teaching simulation concepts, modeling queues, services, and resource contention, and prototyping event-driven systems in JavaScript.

## Features

- Event-driven simulation with a priority queue
- Process-oriented model using generator functions
- Timeouts and arbitrary event synchronization
- Resource locking and preemption
- Queue-like containers and stores
- Filtered stores keyed by item predicate
- Interrupt support for running processes
- Small, dependency-light implementation suitable for learning and experimentation

## Installation

Since this is an ES module package, import it directly:

```js
import { Simulation, Resource, Store } from './index.js';
```

Or from a package install if you publish it to a module-aware environment.

The distribution benchmark is available separately with `npm run benchmark` so
it does not slow down the test suite.

## Quick start

```js
import { Simulation } from './index.js';

const sim = new Simulation();

function* worker() {
  console.log('start', sim.now());
  yield sim.timeout(5);
  console.log('after 5 time units', sim.now());
}

sim.process(worker());
sim.run(10);
```

This schedules a process, advances the simulation clock, and stops when the target time is reached.

## Core concepts

### Simulation

The `Simulation` object is the main engine:

```js
const sim = new Simulation();
```

It provides:

- `sim.now()` - current simulation time
- `sim.event()` - create a bare event
- `sim.timeout(delay, options)` - create a clock-based event
- `sim.process(generator)` - start a process
- `sim.and(ev1, ev2)` / `sim.or(ev1, ev2)` - combine events
- `sim.allof(...events)` / `sim.anyof(...events)` - multi-event conditions
- `sim.run(until)` - advance until a deadline or until a stopping event fires

### Event model

Every action is represented as an `Event` with:

- `id`
- `state`
- `scheduled_time`
- `priority`
- `result`
- `callbacks`

Event states are:

```js
const EventState = {
  IDLE: 0,
  SCHEDULED: 1,
  PROCESSED: 2
};
```

The event heap orders events by:

1. earlier scheduled time
2. higher priority
3. lower id (stable tie-breaker)

### Processes

Processes are generator-based coroutines. A process runs until it yields an event, then it waits for that event to fire before continuing.

```js
function* producer(sim) {
  for (let i = 0; i < 3; i++) {
    console.log('producing', i, 'at', sim.now());
    yield sim.timeout(2);
  }
}

sim.process(producer(sim));
sim.run(10);
```

A process may:

- `yield sim.timeout(...)`
- `yield req` where `req` is a resource request event
- `yield sim.or(a, b)` or `yield sim.and(a, b)`
- `yield event` returned by other simulation primitives

When the yielded event is processed, the generator resumes with the event result.

### Interrupts

Processes can be interrupted using `proc.interrupt(cause)`. This is useful for preempting work or waking a sleeping process.

```js
function* worker(sim) {
  try {
    yield sim.timeout(Infinity);
  } catch (exc) {
    console.log('Interrupted by', exc.cause.by);
  }
}

const p = sim.process(worker(sim));
sim.process(function* () {
  yield sim.timeout(5);
  yield p.interrupt({ by: 'boss' });
});
```

Interrupts are delivered through a synthetic `InterruptException` with `exc.cause` carrying the interruption payload.

## API reference

### `new Simulation(clock = 0)`

Creates a new simulation with an initial clock value.

### `sim.now()`

Returns the current simulation time.

### `sim.event()`

Creates a new idle event object.

```js
const ev = sim.event();
```

### `sim.timeout(delay, { priority = 0, result = null } = {})`

Schedules a timeout after `delay` simulation time units.

```js
const ev = sim.timeout(10, { priority: 5, result: 'done' });
```

### `sim.and(ev1, ev2)`

Returns a condition that succeeds when both events have been processed.

### `sim.or(ev1, ev2)`

Returns a condition that succeeds when either event is processed.

### `sim.allof(...events)`

Same as `and` across multiple events.

### `sim.anyof(...events)`

Same as `or` across multiple events.

### `sim.process(generator)`

Starts a process from a generator function.

```js
sim.process(function* () {
  yield sim.timeout(1);
  console.log('done');
});
```

### `sim.run(until = Infinity)`

Starts the simulation loop. `until` may be:

- a number, meaning stop when the simulation reaches that absolute time
- an event, meaning stop when that event is processed

```js
sim.run(100);
// or
const limit = sim.timeout(100);
sim.run(limit);
```

### Event methods

A raw event supports:

- `event.schedule(delay, { priority, result })`
- `event.succeed({ priority, result })`
- `event.fail(error, { priority })`
- `event.append_callback(fn, ...args)`
- `event.remove_callback(cb)`

When an event is processed, the result is stored in `event.result`, and all callbacks are invoked in insertion order.

## Resource scheduling

### `new Resource(sim, capacity = 1)`

Represents a single resource with a fixed capacity.

```js
const sim = new Simulation();
const lock = new Resource(sim, 1);
```

### `resource.request({ priority = 0, preempt = false } = {})`

Requests access to the resource.

If `preempt` is `true`, the request may preempt lower-priority holders.

```js
const req = lock.request({ priority: 5 });
yield req;
```

When used with the `using` statement, resources are automatically released when the scope exits.

```js
function* worker() {
  using req = lock.request();
  yield req;
  // resource is held here
}
```

### `resource.release(req, { priority = 0 } = {})`

Releases a prior request. This is often handled automatically by `using`.

## Containers

### `new Container(sim, capacity, { level = 0 } = {})`

A resource-like container with a numeric level.

```js
const buffer = new Container(sim, 10, { level: 0 });
```

Methods:

- `buffer.put(amount, { priority = 0 })`
- `buffer.get(amount, { priority = 0 })`

A container permits a put or get only if it does not violate capacity limits or go negative.

## Stores

### `new Store(sim, capacity = Infinity, { items = [] } = {})`

A bounded FIFO store.

```js
const queue = new Store(sim, 5);
```

Methods:

- `queue.put(item, { priority = 0 })`
- `queue.get({ priority = 0 })`

The `get()` call returns the stored item as the event result.

## Filter stores

### `new FilterStore(sim, capacity = Infinity, { items = new Map() } = {})`

A store keyed by item counts. This is useful when you need to select a matching item instead of just the first item in a queue.

```js
const letters = new FilterStore(sim, 5, { items: new Map([['a', 2], ['b', 1]]) });
```

Methods:

- `letters.put(item, { priority = 0 })`
- `letters.get(predicate, { priority = 0 })`

The `get()` method searches the store for the first item that matches the predicate function.

```js
const nice = yield letters.get((item) => item === 'b');
```

The store maintains a `load` field that tracks the total number of items currently stored.

## Condition waiting

Conditions let a process wait for multiple events or for a logical combination of them.

```js
const ev1 = sim.event();
const ev2 = sim.event();

function* p() {
  const result = yield sim.and(ev1, ev2);
  console.log(result);
}
```

The condition fires when the logical rule is satisfied:

- `sim.and(a, b)` requires both processed
- `sim.or(a, b)` requires at least one processed
- `sim.allof(...events)` and `sim.anyof(...events)` generalize this to many events

If a dependency event fails with an error, that error is propagated as the condition result.

## Examples

The project includes several example programs in the `examples/` directory:

- `bank_renege.js` — customer arrival, service, and reneging behavior
- `machine_shop.js` — machine repair with preemptive priority scheduling
- `gas_refueling.js` — service queue simulation (if present in your version)
- `carwash.js` — queueing and capacity simulation

You can run them with a Node-compatible ES module runtime.

## Example: resource locking

```js
import { Simulation, Resource } from './index.js';

const sim = new Simulation();
const lock = new Resource(sim, 1);

function* worker(name) {
  console.log(name, 'waiting at', sim.now());
  using req = lock.request();
  yield req;
  console.log(name, 'acquired lock at', sim.now());
  yield sim.timeout(5);
  console.log(name, 'released at', sim.now());
}

sim.process(worker('A'));
sim.process(worker('B'));
sim.run(20);
```

## Example: store queue

```js
import { Simulation, Store } from './index.js';

const sim = new Simulation();
const queue = new Store(sim, 2);

function* producer() {
  for (const item of ['a', 'b', 'c']) {
    yield queue.put(item);
    console.log('stored', item, 'at', sim.now());
  }
}

function* consumer() {
  while (true) {
    const item = yield queue.get();
    console.log('got', item, 'at', sim.now());
  }
}

sim.process(producer());
sim.process(consumer());
sim.run(20);
```

## Semantics and assumptions

### Simulation time

Time is discrete and not tied to wall-clock time. All `yield sim.timeout(...)` calls and resource scheduling are expressed in simulation units.

### Priority ordering

When multiple events share the same scheduled time, higher priority values win. Smaller IDs break ties deterministically.

### Process lifecycle

A process is started when created, enters `STARTED` when its initial wake-up event is processed, and is marked `STOPPED` when the generator completes.

### Errors

A process may throw an exception by yielding an event whose `result` is an `Error` object. This is used internally for interruptions and failed conditions.

## Notes for advanced use

- The library intentionally favors clarity and teaching value over maximum abstraction.
- All simulation activity is synchronous from the perspective of the user code—execution takes place inside the simulation loop.
- The implementation is built around JavaScript generator functions and ES module syntax, so it works best in a modern JavaScript runtime.

## Testing

The project uses Node’s built-in test runner:

```bash
node --test
```

This runs the current regression and feature tests in the repository.

## Contributing

The project is intentionally compact. Contributions are most welcome if they:

- improve correctness and determinism
- add missing tests
- clarify documentation
- make the scheduler or resource semantics more robust without breaking the public API

## License

This project is distributed under the MIT license.
