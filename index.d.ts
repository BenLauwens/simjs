export type EventStateValue = 0 | 1 | 2;
export type ProcessStateValue = 0 | 1 | 2 | 3;

export const EventState: {
  readonly IDLE: 0;
  readonly SCHEDULED: 1;
  readonly PROCESSED: 2;
};

export const ProcessState: {
  readonly STARTING: 0;
  readonly STARTED: 1;
  readonly STOPPED: 2;
  readonly FAILED: 3;
};

export const ResourceDispatchResult: {
  readonly BLOCKED: 'blocked';
  readonly COMPLETED: 'completed';
  readonly CONTINUE: 'continue';
};

export class SimJSError extends Error {}
export class SimulationError extends SimJSError {}
export class EmptyScheduleError extends SimulationError {}
export class InvalidEventError extends SimulationError {}
export class ProcessError extends SimulationError {}
export class ResourceError extends SimulationError {}
export class SimulationStopError extends SimulationError {}

export interface TimeoutOptions {
  priority?: number;
  result?: unknown;
}

export interface ResourceOptions {
  priority?: number;
  preempt?: boolean;
}

export interface SimulationHooks {
  onSchedule?: (event: Event) => void;
  onProcess?: (event: Event) => void;
  onError?: (error: unknown, event: Event) => void;
}

export class Event<T = unknown> {
  readonly sim: Simulation;
  readonly id: number;
  readonly callbacks: Array<() => void>;
  event_state: EventStateValue;
  result: T | null;
  scheduled_time: number | null;
  priority: number;
  schedule(delay?: number, options?: TimeoutOptions): this;
  succeed(options?: TimeoutOptions): this;
  fail(error: unknown, options?: Omit<TimeoutOptions, 'result'>): this;
  append_callback(callback: (event: this, ...args: any[]) => void, ...args: any[]): () => void;
  remove_callback(callback: () => void): void;
}

export class Process<T = unknown> extends Event<T> {
  readonly generator: Generator;
  process_state: ProcessStateValue;
  waiting_for: Event | null;
  interrupt(cause?: unknown): Event<void>;
}

export class Condition<T = unknown> extends Event<T> {}

export class Simulation {
  constructor(clock?: number, hooks?: SimulationHooks);
  readonly active_process: Process | null;
  now(): number;
  event<T = unknown>(): Event<T>;
  timeout<T = unknown>(delay: number, options?: TimeoutOptions & { result?: T }): Event<T>;
  process<T = unknown>(generator: Generator | ((simulation: this) => Generator)): Process<T>;
  and<T = unknown>(first: Event, second: Event): Condition<T>;
  or<T = unknown>(first: Event, second: Event): Condition<T>;
  allof<T = unknown>(...events: Event[]): Condition<T[]>;
  anyof<T = unknown>(...events: Event[]): Condition<T[]>;
  run(until?: number | Event): void;
}

export class Resource {
  constructor(simulation: Simulation, capacity?: number);
  request(options?: ResourceOptions): Event<void>;
  release(request: Event, options?: Pick<ResourceOptions, 'priority'>): Event<void>;
}

export class Container {
  level: number;
  constructor(simulation: Simulation, capacity: number, options?: { level?: number });
  put(amount: number, options?: Pick<ResourceOptions, 'priority'>): Event<void>;
  get(amount: number, options?: Pick<ResourceOptions, 'priority'>): Event<void>;
}

export class Store<T = unknown> {
  readonly items: T[];
  constructor(simulation: Simulation, capacity?: number, options?: { items?: T[] });
  put(item: T, options?: Pick<ResourceOptions, 'priority'>): Event<void>;
  get(options?: Pick<ResourceOptions, 'priority'>): Event<T>;
}

export class FilterStore<T = unknown> {
  readonly items: Map<T, number>;
  readonly load: number;
  constructor(simulation: Simulation, capacity?: number, options?: { items?: Map<T, number> });
  put(item: T, options?: Pick<ResourceOptions, 'priority'>): Event<void>;
  get(predicate: (item: T) => boolean, options?: Pick<ResourceOptions, 'priority'>): Event<T>;
}
