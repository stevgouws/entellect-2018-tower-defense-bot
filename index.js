// "use strict"
let fs = require("fs")
let { unique, random, allHighest, allLowest, least, most } = require("./helpers")
let commandFileName = "command.txt"
let {
  myself,
  opponent,
  mapSize,
  buildingStats,
  cells,
  buildings,
  myBuildings,
  emptyCells,
  myEnergyProduction,
  DEFENSE,
  ATTACK,
  ENERGY,
  TESLA,
  IRON_CURTAIN,
  myTurrets,
  enemyTurrets,
  currentRound
} = require("./state.js")

run()

function run() {
  if (myself.ironCurtainAvailable && myself.energy >= 100) {
    return build(7, 7, IRON_CURTAIN)
  }
  if (!canAffordTurret() || !canStillAffordEnergyTheFollowingRound()) {
    return buildEnergy()
  }
  attack()
}

function canStillAffordEnergyTheFollowingRound() {
  // basically avoid not being able to build something each round
  return myself.energy + myEnergyProduction - buildingStats[ATTACK].price > buildingStats[ENERGY].price
}

function canAffordTurret() {
  return myself.energy >= buildingStats[ATTACK].price
}

function buildEnergy() {
  let allMostViable = allHighest(emptyCells, "energyViability")
  allMostViableNotAboutToBeHit = checkForImminentAttack(allMostViable, ENERGY)
  let { x, y } = least(allMostViableNotAboutToBeHit, "x")
  build(x, y, ENERGY)
}

function attack() {
  let allMostViable = allHighest(emptyCells, "turretViability")
  allMostViableNotAboutToBeHit = checkForImminentAttack(allMostViable, ATTACK)
  let { x, y } = most(allMostViableNotAboutToBeHit, "x")
  build(x, y, ATTACK)
}

function checkForImminentAttack(allMostViable, buildingType) {
  let allMostViableNotAboutToBeHit = allMostViable.filter(
    emptyCell => buildingStats[buildingType].constructionTime > emptyCell.impactInXRounds
  )
  if (!allMostViableNotAboutToBeHit.length) {
    return allMostViable
  }
  return allMostViableNotAboutToBeHit
}

function build(x, y, buildingType) {
  if (!passedSafetyChecks(x, y, buildingType)) {
    return doNothing()
  }
  writeToFile(commandFileName, `${x},${y},${buildingType}`)
}

function passedSafetyChecks(x, y, buildingType) {
  if (!enoughEnergy(buildingType)) {
    console.log("!!!Not enough energy to build anything")
    return false
  }
  if (buildingType == IRON_CURTAIN) {
    return true
  }
  if (!cellIsEmpty(x, y)) {
    console.log("!!!Trying to write to occupied cell")
    return false
  }
  return true
}

function cellIsEmpty(x, y) {
  return Boolean(emptyCells.find(cell => cell.x == x && cell.y == y))
}

function enoughEnergy(buildingType) {
  return buildingStats[buildingType].price <= myself.energy
}

function doNothing() {
  writeToFile(commandFileName, ``)
}

function writeToFile(fileName, payload) {
  fs.writeFile("./" + fileName, payload, err => {
    if (err) {
      return console.log(err)
    }
  })
}
