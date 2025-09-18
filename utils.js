export { getRandomExponential, getRandomIn, getRandomIntInclusive };

function getRandomExponential(lambda) {
    return - Math.log(1 - Math.random()) / lambda;
}

function getRandomIn(min, max) {
    return Math.random() * (max - min) + min;
}

function getRandomIntInclusive(min, max) {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled); // The maximum is inclusive and the minimum is inclusive
}