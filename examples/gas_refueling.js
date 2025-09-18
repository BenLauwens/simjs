import { Simulation, Container, Resource } from '../index.js';
import { getRandomIntInclusive } from './utils.js';

const STATION_TANK_SIZE = 200;
const THRESHOLD = 25;
const CAR_TANK_SIZE = 50;
const CAR_TANK_LEVEL = [5, 25];
const REFUELING_SPEED = 2;
const TANK_TRUCK_TIME = 300;
const T_INTER = [30, 300];
const SIM_TIME = 1000;

function* car(sim, name, gas_station, station_tank) {
    const car_tank_level = getRandomIntInclusive(...CAR_TANK_LEVEL);
    console.log(sim.now().toFixed(1).padStart(6, '0') + ': ' + name + ' arrived at gas station');
    using req = gas_station.lock()
    yield req;
    const fuel_required = CAR_TANK_SIZE - car_tank_level;
    yield station_tank.get(fuel_required);
    yield sim.timeout(fuel_required / REFUELING_SPEED);
    console.log(sim.now().toFixed(1).padStart(6, '0') + ': ' + name + ' refueled with ' + fuel_required +'L');
}

function* gas_station_control(sim, station_tank) {
    while (true) {
        if (station_tank.level / station_tank.capacity * 100 < THRESHOLD) {
            console.log(sim.now().toFixed(1).padStart(6, '0') + ': Calling tank truck');
            yield sim.process(tank_truck(sim, station_tank));
        }
        yield sim.timeout(10);
    }
}

function* tank_truck(sim, station_tank) {
    yield sim.timeout(TANK_TRUCK_TIME);
    const amount = station_tank.capacity - station_tank.level;
    station_tank.put(amount);
    console.log(sim.now().toFixed(1).padStart(6, '0') + ': Tank truck arrived and refuelled station with ' + amount + 'L');
}

function* car_generator(sim, gas_station, station_tank) {
    for (let i=0; true ; i++) {
        yield sim.timeout(getRandomIntInclusive(...T_INTER));
        sim.process(car(sim, 'Car ' + i, gas_station, station_tank));
    }
}

const sim = new Simulation();
const gas_station = new Resource(sim, 2);
const station_tank = new Container(sim, STATION_TANK_SIZE, {level: STATION_TANK_SIZE});
sim.process(gas_station_control(sim, station_tank));
sim.process(car_generator(sim, gas_station, station_tank));
sim.run(SIM_TIME);