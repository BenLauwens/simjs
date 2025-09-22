export { getRandomExponential, getRandomGaussian, getRandomIn, getRandomIntInclusive };

function getRandomExponential(lambda) {
    return - Math.log(1 - Math.random()) / lambda;
}

function getRandomGaussian(mean=0, stdev=1) {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    return z * stdev + mean;
}

function getRandomIn(min, max) {
    return Math.random() * (max - min) + min;
}

function getRandomIntInclusive(min, max) {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled);
}