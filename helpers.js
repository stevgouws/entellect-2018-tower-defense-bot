/***
 * Returns an array with one less level of nesting
 * @param array
 * @returns {Array}
 */
function flatMap(array) {
  return array.reduce((acc, x) => acc.concat(x), [])
}

function unique(array) {
  return [...new Set(array)]
}

function random(array) {
  return array[Math.floor(Math.random() * array.length)]
}

let test = [
  {
    x: 1
  },
  {
    x: 1
  },
  {
    x: 2
  },
  {
    x: 3
  }
]

function least(arr, attribute) {
  let least = arr.reduce((previous, current) => {
    if (previous[attribute] == current[attribute]) {
      return random([previous, current])
    }
    return previous[attribute] < current[attribute] ? previous : current
  })
  return least
}

function most(arr, attribute) {
  let most = arr.reduce((previous, current) => {
    if (previous[attribute] == current[attribute]) {
      return random([previous, current])
    }
    return previous[attribute] > current[attribute] ? previous : current
  })
  return most
}

function allHighest(arr, attribute) {
  let allAttributeValues = arr.map(item => item[attribute])
  let highestAttributeValue = Math.max(...allAttributeValues)
  return arr.filter(item => item[attribute] == highestAttributeValue)
}

function allLowest(arr, attribute) {
  let allAttributeValues = arr.map(item => item[attribute])
  let lowestAttributeValue = Math.min(...allAttributeValues)
  return arr.filter(item => item[attribute] == lowestAttributeValue)
}

module.exports = {
  flatMap,
  unique,
  random,
  least,
  most,
  allHighest,
  allLowest
}
