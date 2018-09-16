// 1.3 //

- Check for lowest opposingTurret count and place furthest back instead of random yCoord for Energy
- think this versions targets ENERGY instead of Attack primarily

// 1.4 //

- markEnemyBuildingsDefenseCount()
- get enemyEnergy targets then get frontmost emptyCell to attack from
- add priorityTarget data & target based on that + defense rating

// 1.5 //

- Change opposingTurrets to vulnerability & add walls to vulnerability rating as posing bigger threat
- Add constructionTimeLeft to priorityRating
- Implement coverProvided rating on emptyCells (how many friendlies cover will be provided to by building here)
- addWallViability
- addEnergyViability
- fix bug where it skips turn at beginning if energy is equal to required energy (also fixed it in 1.3 and 1.4)

// 1.6 //

- Apply vulnerability based on missile impactNextRound
- Check for turrets that will complete next round and add impactNextRound

// 1.7 //

- Implement turretViability based on complicated calculation
  // 1.7 - continued //
- Fix bug that caused NaN turretViability
- Fix bug that adds impactInXRounds twice (once for missile and once for next round in missile)
- Changed emptyCell.turretViability -= emptyCell.vulnerability _ 2 to not be _ 2 (THEN BEAT 1.7b)

// 1.8 //

- Changed:
  const impactInXRoundsLookup = [0, 10, 8, 6, 4, 2, 1] to
  const impactInXRoundsLookup = [0, 10, 9, 8, 7, 6, 5]
- Select furthest forward cell from all cells with highest turretViability

// 1.9 //

- Added checkForImminentAttack on build ENERGY and ATTACK
- Remove vulnerability
- Remove targetPriority (rather just use turretViability)
- Changed:

```js
function addTurretViabilityByTargetPriority(emptyCell) {
  let enemyBuildingsOnSameRow = enemyBuildings.filter(
    building => building.y == emptyCell.y
  );
  enemyBuildingsOnSameRow.forEach(building => {
    emptyCell.turretViability += building.targetPriority;
  });
}
```

to

```js
function addTurretViabilityByEnemyEnergyBuildingsOnSameRow(emptyCell) {
  let enemyEnergyBuildingsOnSameRow = enemyEnergyBuildings.filter(
    building => building.y == emptyCell.y
  );
  enemyEnergyBuildingsOnSameRow.forEach(building => {
    emptyCell.turretViability++;
  });
}
```

and added

```js
emptyCell.turretViability += building.targetPriority;
```

- Added impactInXRounds to enemyCells
- Remove destroyed Buildings
- Fixed impactInXRounds to calculate missiles from new turrets only after destroyed buildings have been removed so that it doesn't think a missile
  fired from a destroyed building
- Changed haveOptimalEnergy from

```js
myEnergyProduction >= 30 || myself.energy + myEnergyProduction >= 40;
```

to

```js
// basically build energy if the next round would otherwise drop you to having less energy than the cost to build more energy
// so basically avoid making no move any round
myself.energy + myEnergyProduction - buildingStats[ATTACK].price >
  buildingStats[ENERGY].price;
```

// 1.10 //

- Refactored destroyerama.js
- Fixed checkForImminentAttack to take buildingType param. (Before was always comparing against constructiontime of ENERGY) (Won't make a difference if ENERGY and ATTACK have same construction time.)
- Fixed bug that would result in build nothing if I could not afford to build a turret with current energy, but still would have enough energy the following round to build energy. (Now beating Pieter-bot (priorities 10/10))

// 1.11 /

- Refactored
- Moved

```js
emptyCell.energyViability -= emptyCell.x; // further back is better` from state.js
```

to destroyerama.js. Otherwise there was too much weight in the x position.

```js
let { x, y } = most(allMostViableNotAboutToBeHit, "x");
```

// 1.11_b //

- Changed

```js
let myEnergyProduction =
  myEnergyBuilings.length * buildingStats[ENERGY].energyGeneratedPerTurn;
```

to

```js
let myEnergyProduction =
  myEnergyBuilingsGeneratingEnergy.length *
  buildingStats[ENERGY].energyGeneratedPerTurn;
```

> lost 86 to 14 against 1.11 so reverted.

// 1.12 /

- changed turretViability to use turretViability += 5 only if weaponCooldown == 2 && initialTarget is turret

// 1.13 /
Added killswitch

// 1.14 /
Added Iron curtain

// 1.15 /
Fixed bug where turretViability was being set twice.

// 1.16 /
Changed
```js
  if (enemyBuildingsOnSameRow.length) {
    let initialTarget = least(enemyBuildingsOnSameRow, "x")
    emptyCell.turretViability += targetPriorityRating[initialTarget.buildingType]
  }
```
to
```js
    if (initialTarget.buildingType == "ATTACK" && missileWillDestroyTargetBeforeItFires(emptyCell, initialTarget)) {
      emptyCell.turretViability += 5
    } else {
      emptyCell.turretViability += targetPriorityRating[initialTarget.buildingType]
    }
```

// 1.17 //
added attack ENERGY if enemyTurrets are still cooling down
```js
  if (initialTarget.buildingType == "ATTACK") {
    emptyCell.turretViability += weaponCooldownTimeLeftTargetRating[initialTarget.weaponCooldownTimeLeft]
  }
```