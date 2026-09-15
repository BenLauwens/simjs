import { getRandomExponential, getRandomGaussian } from './examples/utils.js';

const NUM = 100000000;
let samples = new Float64Array(NUM);
let start = Date.now();
for (let i = 0; i < NUM; i++) {
    samples[i] = getRandomGaussian(4, 3);
}
console.log(Date.now() - start);
let mean = samples.reduce((a, b) => a + b, 0) / NUM;
let variance = samples.map((a) => (a - mean) ** 2).reduce((a, b) => a + b, 0) / (NUM - 1);
console.log(mean, variance);

samples = new Float64Array(NUM);
start = Date.now();
for (let i = 0; i < NUM; i++) {
    samples[i] = getRandomExponential(2);
}
console.log(Date.now() - start);
mean = samples.reduce((a, b) => a + b, 0) / NUM;
variance = samples.map((a) => (a - mean) ** 2).reduce((a, b) => a + b, 0) / (NUM - 1);
console.log(mean, variance);