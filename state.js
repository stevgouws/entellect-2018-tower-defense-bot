console.time("state generation")
const DEFENSE = 0
const ATTACK = 1
const ENERGY = 2
const DECONSTRUCT = 3
const TESLA = 4
const IRON_CURTAIN = 5
let stateFile = require("./state.json")
let currentRound = stateFile.gameDetails.round
let { flatMap, unique, most, least, allHighest } = require("./helpers.js")
let myself = stateFile.players.find(player => player.playerType === "A")
let opponent = stateFile.players.find(player => player.playerType === "B")
let mapSize = {
  x: stateFile.gameDetails.mapWidth,
  y: stateFile.gameDetails.mapHeight
}
let buildingStats = []
buildingStats[DEFENSE] = stateFile.gameDetails.buildingsStats.DEFENSE
buildingStats[ATTACK] = stateFile.gameDetails.buildingsStats.ATTACK
buildingStats[ENERGY] = stateFile.gameDetails.buildingsStats.ENERGY
buildingStats[DECONSTRUCT] = null
buildingStats[TESLA] = stateFile.gameDetails.buildingsStats.TESLA
buildingStats[IRON_CURTAIN] = stateFile.gameDetails.ironCurtainStats
let gameMap = stateFile.gameMap
let cells = flatMap(gameMap)
let buildingsBeforeDestroyedRemoved = flatMap(
  cells.filter(cell => cell.buildings.length > 0).map(cell => cell.buildings)
)
setNewCellPropertyDefaults()
let [missiles, turrets] = addImpactInXRounds()
let [emptyCells, buildings] = removeDestroyedBuildings()
addImpactInXRoundsForNewTurrets()

let myBuildings = buildings.filter(building => building.playerType == "A")
let myEnergyBuilings = myBuildings.filter(building => building.buildingType == "ENERGY")
let myTurrets = myBuildings.filter(building => building.buildingType == "ATTACK")
let enemyBuildings = buildings.filter(building => building.playerType == "B")
let enemyEnergyBuildings = enemyBuildings.filter(building => building.buildingType == "ENERGY")
let enemyWalls = enemyBuildings.filter(building => building.buildingType == "DEFENSE")
let enemyTurrets = enemyBuildings.filter(building => building.buildingType == "ATTACK")
let enemyMissiles = missiles.filter(missile => missile.playerType == "B")
let myMissiles = missiles.filter(missile => missile.playerType == "A")
let myEnergyProduction = myEnergyBuilings.length * buildingStats[ENERGY].energyGeneratedPerTurn

addEmptyCellsAdditionalStats()

function setNewCellPropertyDefaults() {
  cells.forEach(cell => {
    cell.impactInXRounds = 0
  })
}

function addImpactInXRounds() {
  return [addImpactInXRoundsBasedOnCurrentMissiles(), addImpactInXRoundsBasedOnWeaponCooldown()]
}

function addImpactInXRoundsBasedOnCurrentMissiles() {
  let missiles = flatMap(cells.filter(cell => cell.missiles.length > 0).map(cell => cell.missiles))
  missiles.forEach(missile => {
    addMissileLocation(missile)
  })
  return missiles
}

function addImpactInXRoundsBasedOnWeaponCooldown() {
  // don't have to worry about excluding turrets that will be destroyed next round because
  // game engine fires missiles before destroying buildings, so they will still fire
  let turrets = buildingsBeforeDestroyedRemoved.filter(building => building.buildingType == "ATTACK")
  turrets.forEach(turret => {
    if (aboutToFireAndNotUnderConstuction(turret)) {
      addMissileLocation(turret)
    }
  })
  return turrets
}

function aboutToFireAndNotUnderConstuction(turret) {
  // Turrets that finish construction the following round are added only after destroyed buildings have been
  // removed in addImpactInXRoundsForNewTurrets() otherwise it will think the missile hit
  // something when actually that building has been destroyed and the missile is still flying
  return [0, 1].includes(turret.weaponCooldownTimeLeft && turret.constructionTimeLeft == -1)
}

function addMissileLocation(missileOrTurret) {
  let isFriendly = missileOrTurret.playerType == "A"
  let numberOfColumnsToCheck
  if (isFriendly) {
    numberOfColumnsToCheck = gameMap[0].length - 1 - missileOrTurret.x
  } else {
    numberOfColumnsToCheck = missileOrTurret.x
  }
  for (let index = 1; index <= numberOfColumnsToCheck; index++) {
    let cellToCheck
    if (isFriendly) {
      cellToCheck = cells.find(cell => cell.y == missileOrTurret.y && cell.x == missileOrTurret.x + index)
    } else {
      cellToCheck = cells.find(cell => cell.y == missileOrTurret.y && cell.x == missileOrTurret.x - index)
    }
    if (cellToCheck.impactInXRounds > 0) {
      return // only calculate impact for first missile to hit. Otherwise it will add second incoming missile on top.
    }
    if (!cellToCheck) {
      throw new Error("trying to check invalid cell")
    }
    cellToCheck.impactInXRounds += roundsUntilImpact(missileOrTurret, cellToCheck)
    if (cellToCheck.buildings.length) {
      break // stop checking if it hits something
    }
  }
}

function roundsUntilImpact(missileOrTurret, cellToCheck) {
  return Math.round(
    Math.abs(missileOrTurret.x - cellToCheck.x) / (missileOrTurret.speed || missileOrTurret.weaponSpeed) // depending on if it's a turret or a missile
  )
}

function addImpactInXRoundsForNewTurrets() {
  // Have to do it seperate from WeaponCooldown ones so that it first removes destroyed ones.
  // Otherwise it will think the missile hit a building which is not there because it was destroyed.
  let newTurrets = buildings.filter(building => building.buildingType == "ATTACK" && building.constructionTimeLeft == 0)
  newTurrets.forEach(turret => {
    addMissileLocation(turret, turret.playerType == "A")
  })
}

function removeDestroyedBuildings() {
  let emptyCells = cells.filter(cell => cell.buildings.length == 0 && cell.x <= mapSize.x / 2 - 1)
  // no need to add destroyed buildings to emptyCells as game engen does player commands before
  // destroying buildings so even though it's destroyed that cell is not available yet to build on.
  unDestroyedBuildings = buildingsBeforeDestroyedRemoved.filter(building => {
    let cell = cells.find(cell => cell.x == building.x && cell.y == building.y)
    return cell.impactInXRounds != 1 || building.health - buildingStats[ATTACK].weaponDamage > 0
  })
  return [emptyCells, unDestroyedBuildings]
}

function addEmptyCellsAdditionalStats() {
  emptyCells.forEach(emptyCell => {
    emptyCell.potentialCoverProvided = potentialCoverProvidedRating(emptyCell.y)
    addWallViability(emptyCell)
    addEnergyViability(emptyCell)
    addTurretViability(emptyCell)
    emptyCell.enemyRowDefenseRating = calcRowDefenseRating(emptyCell.y)
    emptyCell.rowAttackingTurretsCount = rowAttackingTurretsCount(emptyCell.y)
  })
}

function potentialCoverProvidedRating(yCoord) {
  const coverProvidedToRating = {
    ENERGY: 1,
    ATTACK: 2,
    DEFENSE: 0
  }
  let buildingsBehind = myBuildings.filter(building => building.y == yCoord)
  let potentialCoverProvided = 0
  buildingsBehind.forEach(building => {
    potentialCoverProvided += coverProvidedToRating[building.buildingType]
  })
  return potentialCoverProvided
}

function addWallViability(emptyCell) {
  emptyCell.wallViability = 0
  emptyCell.wallViability += emptyCell.potentialCoverProvided
}

function addEnergyViability(emptyCell) {
  emptyCell.energyViability = 0
  emptyCell.energyViability -= energyOnSameRowCount(emptyCell.y) // spread out is better
  emptyCell.energyViability -= enemyRowAttackRating(emptyCell.y) // better to build where being less attacked // SG_TODO:(unless health gets low???)
}

function energyOnSameRowCount(yCoord) {
  return myEnergyBuilings.filter(building => building.y == yCoord).length
}

function enemyRowAttackRating(yCoord) {
  // only for purpose of optimising energy placement (not go for kill strat)
  // so not worrying about walls that don't have turrets behind them.
  let rowAttackRating = 0
  let enemyTurretsOnSameRow = enemyTurrets.filter(turret => turret.y == yCoord)
  enemyTurretsOnSameRow.forEach(enemyTurret => {
    rowAttackRating++
    rowAttackRating += wallsInFrontOfTurret(enemyTurret)
  })
  return rowAttackRating
}

function wallsInFrontOfTurret(enemyTurret) {
  let wallsInFrontOfTurret = enemyBuildings.filter(
    building => building.buildingType == "DEFENSE" && building.y == enemyTurret.y && building.x < enemyTurret.x
  )
  return wallsInFrontOfTurret.length
}

function addTurretViability(emptyCell) {
  emptyCell.turretViability = 0
  addTurretViabilityByInitialTargetType(emptyCell)
  addTurretViabilityByEnemyEnergyBuildingsOnSameRow(emptyCell)
}

function addTurretViabilityByInitialTargetType(emptyCell) {
  const targetPriorityRating = {
    ENERGY: 1,
    ATTACK: 5,
    DEFENSE: 0
  }
  let enemyBuildingsOnSameRow = enemyBuildings.filter(building => building.y == emptyCell.y)
  if (enemyBuildingsOnSameRow.length) {
    let initialTarget = least(enemyBuildingsOnSameRow, "x")
    // emptyCell.turretViability += targetPriorityRating[initialTarget.buildingType] // SG_TODO: fix duplication
    if (initialTarget.buildingType == "ATTACK" && missileWillDestroyTargetBeforeItFires(emptyCell, initialTarget)) {
      emptyCell.turretViability += 5
    } else {
      emptyCell.turretViability += targetPriorityRating[initialTarget.buildingType]
    }
  }
}

function missileWillDestroyTargetBeforeItFires(emptyCell, initialTarget) {
  // if 1 then it's already too late as it also destroyes my turret when it fires
  let roundsUntilImpact = Math.round(Math.abs(initialTarget.x - emptyCell.x) / buildingStats[ATTACK].weaponSpeed)
  return initialTarget.weaponCooldownTimeLeft > roundsUntilImpact
}

function addTurretViabilityByEnemyEnergyBuildingsOnSameRow(emptyCell) {
  let enemyEnergyBuildingsOnSameRow = enemyEnergyBuildings.filter(building => building.y == emptyCell.y)
  enemyEnergyBuildingsOnSameRow.forEach(building => {
    emptyCell.turretViability++
  })
}

function calcRowDefenseRating(yCoord) {
  const defenseRating = {
    ENERGY: 1,
    ATTACK: 2,
    DEFENSE: 5
  }
  enemyBuildingsOnSameRow = enemyBuildings.filter(building => building.y == yCoord)
  rowDefenseRating = 0
  enemyBuildingsOnSameRow.forEach(building => {
    rowDefenseRating += defenseRating[building.buildingType]
  })
  return rowDefenseRating
}

function rowAttackingTurretsCount(yCoord) {
  return myTurrets.filter(turret => turret.y == yCoord).length
}

module.exports = {
  ATTACK,
  DEFENSE,
  ENERGY,
  TESLA,
  IRON_CURTAIN,
  myself,
  opponent,
  mapSize,
  buildingStats,
  cells,
  buildings,
  myBuildings,
  myEnergyBuilings,
  enemyBuildings,
  emptyCells,
  enemyEnergyBuildings,
  enemyWalls,
  enemyTurrets,
  myEnergyProduction,
  myTurrets,
  enemyTurrets,
  currentRound
}
