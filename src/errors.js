export class SimJSError extends Error {
    constructor(message, options) {
        super(message, options);
        this.name = this.constructor.name;
    }
}

export class SimulationError extends SimJSError {}
export class EmptyScheduleError extends SimulationError {}
export class InvalidEventError extends SimulationError {}
export class ProcessError extends SimulationError {}
export class ResourceError extends SimulationError {}

export class SimulationStopError extends SimulationError {
    constructor() {
        super('Stop Simulation');
    }
}
