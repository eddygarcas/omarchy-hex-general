.pragma library

.import "Hex.js" as Hex
.import "Units.js" as Units
.import "Scenario.js" as Scenario

function createState() {
  return {
    turn: 1,
    units: Scenario.buildUnits(),
    terrain: Scenario.buildTerrain(),
    objectives: Scenario.OBJECTIVES,
    arrived: {},            // reinforcement index -> true once placed
    log: ["Turn 1 -- Axis phase. Move your Kampfgruppen west across the river."],
    selectedUnitId: null,
    gameOver: false,
    resultText: ""
  }
}

function inBounds(state, q, r) {
  var o = Hex.axialToOffset(q, r)
  return o.col >= 0 && o.col < Scenario.WIDTH && o.row >= 0 && o.row < Scenario.HEIGHT
}

function terrainCodeAt(state, q, r) {
  if (!inBounds(state, q, r)) return null
  var o = Hex.axialToOffset(q, r)
  return state.terrain[o.row][o.col]
}

function terrainAt(state, q, r) {
  var code = terrainCodeAt(state, q, r)
  return code ? Scenario.TERRAIN[code] : null
}

function unitAt(state, q, r) {
  for (var i = 0; i < state.units.length; i++) {
    var u = state.units[i]
    if (u.strength > 0 && u.q === q && u.r === r) return u
  }
  return null
}

function unitById(state, id) {
  for (var i = 0; i < state.units.length; i++)
    if (state.units[i].id === id) return state.units[i]
  return null
}

function livingUnits(state, side) {
  return state.units.filter(function (u) { return u.strength > 0 && (!side || u.side === side) })
}

function objectiveAt(state, q, r) {
  for (var i = 0; i < state.objectives.length; i++)
    if (state.objectives[i].q === q && state.objectives[i].r === r) return state.objectives[i]
  return null
}

function enemyOf(side) {
  return side === "axis" ? "allies" : "axis"
}

// A hex is in the zone of control of `side`'s enemies if any living enemy
// unit is adjacent to it.
function inEnemyZoc(state, side, q, r) {
  var enemy = enemyOf(side)
  var ns = Hex.neighbors(q, r)
  for (var i = 0; i < ns.length; i++) {
    var u = unitAt(state, ns[i].q, ns[i].r)
    if (u && u.side === enemy) return true
  }
  return false
}

// Dijkstra over terrain cost. Enemy-occupied hexes block; friendly-occupied
// hexes can be crossed but not stopped on; entering an enemy zone of
// control ends the move there (a unit that starts in ZOC may still leave).
function reachable(state, unit) {
  if (unit.moved || unit.attacked) return {}
  var moveAllowance = Units.typeOf(unit).move
  var startKey = Hex.key(unit.q, unit.r)
  var costs = {}
  costs[startKey] = 0
  var frontier = [{ q: unit.q, r: unit.r, cost: 0 }]

  while (frontier.length > 0) {
    frontier.sort(function (a, b) { return a.cost - b.cost })
    var current = frontier.shift()
    var currentKey = Hex.key(current.q, current.r)
    if (currentKey !== startKey && inEnemyZoc(state, unit.side, current.q, current.r)) continue
    var ns = Hex.neighbors(current.q, current.r)
    for (var i = 0; i < ns.length; i++) {
      var n = ns[i]
      var terrain = terrainAt(state, n.q, n.r)
      if (!terrain || !terrain.passable) continue
      var occupant = unitAt(state, n.q, n.r)
      if (occupant && occupant.side !== unit.side) continue
      var newCost = current.cost + terrain.cost
      if (newCost > moveAllowance) continue
      var nk = Hex.key(n.q, n.r)
      if (costs[nk] === undefined || newCost < costs[nk]) {
        costs[nk] = newCost
        frontier.push({ q: n.q, r: n.r, cost: newCost })
      }
    }
  }

  var out = {}
  for (var k in costs) {
    if (k === startKey) continue
    var h = Hex.parseKey(k)
    if (unitAt(state, h.q, h.r)) continue
    out[k] = costs[k]
  }
  return out
}

function moveUnit(state, unitId, q, r) {
  var unit = unitById(state, unitId)
  if (!unit || unit.moved || unit.attacked) return false
  var options = reachable(state, unit)
  if (options[Hex.key(q, r)] === undefined) return false
  unit.q = q
  unit.r = r
  unit.moved = true
  unit.entrenchment = 0
  return true
}

function attackTargets(state, unit) {
  if (unit.attacked) return []
  var range = Units.typeOf(unit).range
  return state.units.filter(function (other) {
    return other.strength > 0 && other.side !== unit.side && Hex.distance(unit, other) <= range
  })
}

function canAttack(state, unit, target) {
  return attackTargets(state, unit).some(function (t) { return t.id === target.id })
}

function combatOdds(state, attacker, defender) {
  var atkType = Units.typeOf(attacker)
  var defType = Units.typeOf(defender)
  var atkValue = (Units.isHardTarget(defender) ? atkType.atkHard : atkType.atkSoft) * (attacker.strength / 10)
  var terrain = terrainAt(state, defender.q, defender.r)
  var defValue = defType.def * (defender.strength / 10) * (1 + terrain.defBonus * 0.25) * (1 + defender.entrenchment * 0.15)
  return atkValue / Math.max(0.1, defValue)
}

function oddsLabel(ratio) {
  if (ratio >= 2.0) return "overwhelming"
  if (ratio >= 1.2) return "favourable"
  if (ratio >= 0.8) return "even"
  return "poor"
}

// Losses are "steps" out of the unit's 10. Indirect-fire (range > 1)
// attackers never take return losses.
function resolveCombat(state, attackerId, defenderId) {
  var attacker = unitById(state, attackerId)
  var defender = unitById(state, defenderId)
  if (!attacker || !defender || attacker.attacked) return null
  var atkType = Units.typeOf(attacker)
  var ratio = combatOdds(state, attacker, defender)
  var effective = ratio * (0.7 + Math.random() * 0.6)

  var defenderLoss, attackerLoss
  if (effective >= 2.0) { defenderLoss = 4 + Math.floor(Math.random() * 3); attackerLoss = 0 }
  else if (effective >= 1.2) { defenderLoss = 2 + Math.floor(Math.random() * 2); attackerLoss = Math.random() < 0.3 ? 1 : 0 }
  else if (effective >= 0.8) { defenderLoss = 1 + Math.floor(Math.random() * 2); attackerLoss = 1 + Math.floor(Math.random() * 2) }
  else { defenderLoss = Math.random() < 0.3 ? 1 : 0; attackerLoss = 2 + Math.floor(Math.random() * 3) }

  defender.strength = Math.max(0, defender.strength - defenderLoss)
  if (atkType.range === 1) attacker.strength = Math.max(0, attacker.strength - attackerLoss)
  attacker.attacked = true
  attacker.moved = true

  var line = attacker.name + " attacks " + defender.name + " (" + ratio.toFixed(1) + ":1) -- "
  if (defender.strength <= 0) line += defender.name + " destroyed!"
  else if (attacker.strength <= 0) line += attacker.name + " destroyed!"
  else line += defender.name + " -" + defenderLoss + ", " + attacker.name + " -" + attackerLoss
  state.log.unshift(line)
  return line
}

function objectiveHolder(state, obj) {
  var u = unitAt(state, obj.q, obj.r)
  return u ? u.side : null
}

function scoreFor(state, side) {
  var pts = 0
  state.objectives.forEach(function (o) { if (objectiveHolder(state, o) === side) pts += o.points })
  return pts
}

function totalObjectivePoints(state) {
  return state.objectives.reduce(function (s, o) { return s + o.points }, 0)
}

// Units that sat still dig in (up to 3 levels); everyone gets a fresh turn.
function resetPhaseFlags(state, side) {
  state.units.forEach(function (u) {
    if (u.side !== side) return
    if (!u.moved) u.entrenchment = Math.min(3, u.entrenchment + 1)
    u.moved = false
    u.attacked = false
  })
}

function placeReinforcements(state, side) {
  Scenario.REINFORCEMENTS.forEach(function (rf, index) {
    if (state.arrived[index] || rf.side !== side || rf.turn > state.turn) return
    var entry = Hex.offsetToAxial(rf.col, rf.row)
    var spot = null
    var ring = [entry].concat(Hex.neighbors(entry.q, entry.r))
    for (var i = 0; i < ring.length && !spot; i++) {
      var t = terrainAt(state, ring[i].q, ring[i].r)
      if (t && t.passable && !unitAt(state, ring[i].q, ring[i].r)) spot = ring[i]
    }
    if (!spot) return
    var o = Hex.axialToOffset(spot.q, spot.r)
    var unit = Scenario.makeUnit("rf" + index, rf.side, rf.type, rf.name, o.col, o.row)
    state.units.push(unit)
    state.arrived[index] = true
    state.log.unshift((side === "axis" ? "Reinforcement: " : "Allied reinforcement: ") + rf.name + " arrives.")
  })
}

// ------------------------------------------------------------- Allied AI
//
// Rules, in priority order per unit:
//   1. Fire at the best-odds target already in range.
//   2. Garrisons sit tight on their objective town.
//   3. Mobile units sortie against a nearby Axis unit when they can reach
//      an adjacent hex and the odds there are at least even.
//   4. Otherwise shift toward the nearest objective the Axis is
//      threatening and that no Allied unit is holding.
//   5. Otherwise hold (and dig in).
function nearestEnemy(state, unit, maxDist) {
  var best = null, bestD = maxDist + 1
  livingUnits(state, enemyOf(unit.side)).forEach(function (e) {
    var d = Hex.distance(unit, e)
    if (d < bestD) { bestD = d; best = e }
  })
  return best
}

function threatenedObjectives(state, side) {
  var enemy = enemyOf(side)
  return state.objectives.filter(function (o) {
    if (objectiveHolder(state, o) === side) return false
    return livingUnits(state, enemy).some(function (e) { return Hex.distance(e, o) <= 4 })
  })
}

// Artillery always fires (no return fire); everyone else needs odds that
// won't just bleed the unit out.
function aiFireIfPossible(state, unit) {
  var targets = attackTargets(state, unit)
  if (targets.length === 0) return false
  targets.sort(function (a, b) { return combatOdds(state, unit, b) - combatOdds(state, unit, a) })
  var odds = combatOdds(state, unit, targets[0])
  if (Units.typeOf(unit).range === 1 && odds < 0.7) return false
  resolveCombat(state, unit.id, targets[0].id)
  return true
}

function aiSortie(state, unit) {
  var type = Units.typeOf(unit)
  if (type.range > 1 || unit.type === "antiTank") return false
  var enemy = nearestEnemy(state, unit, type.move + 1)
  if (!enemy) return false
  var options = reachable(state, unit)
  var best = null, bestScore = 0
  for (var k in options) {
    var h = Hex.parseKey(k)
    if (Hex.distance(h, enemy) !== 1) continue
    // Evaluate as if standing there: odds against that enemy, prefer cover.
    var saved = { q: unit.q, r: unit.r }
    unit.q = h.q; unit.r = h.r
    var odds = combatOdds(state, unit, enemy)
    unit.q = saved.q; unit.r = saved.r
    var score = odds + terrainAt(state, h.q, h.r).defBonus * 0.1
    if (odds >= 1.0 && score > bestScore) { bestScore = score; best = h }
  }
  if (!best) return false
  moveUnit(state, unit.id, best.q, best.r)
  state.log.unshift(unit.name + " advances to engage " + enemy.name + ".")
  aiFireIfPossible(state, unit)
  return true
}

// At most two units answer a call for any one town per phase, and only
// from nearby -- otherwise the whole line strips itself to plug one gap.
function aiShiftToObjective(state, unit, claims) {
  var targets = threatenedObjectives(state, unit.side).filter(function (o) {
    var d = Hex.distance(unit, o)
    return d > 1 && d <= 6 && (claims[o.name] || 0) < 2
  })
  if (targets.length === 0) return false
  targets.sort(function (a, b) { return Hex.distance(unit, a) - Hex.distance(unit, b) })
  var target = targets[0]
  var options = reachable(state, unit)
  var best = null, bestD = Hex.distance(unit, target)
  for (var k in options) {
    var h = Hex.parseKey(k)
    var d = Hex.distance(h, target) + options[k] * 0.01
    if (d < bestD) { bestD = d; best = h }
  }
  if (!best) return false
  claims[target.name] = (claims[target.name] || 0) + 1
  moveUnit(state, unit.id, best.q, best.r)
  state.log.unshift(unit.name + " moves to cover " + target.name + ".")
  aiFireIfPossible(state, unit)
  return true
}

function runAlliesPhase(state) {
  state.log.unshift("-- Allied phase --")
  placeReinforcements(state, "allies")
  var claims = {}
  livingUnits(state, "allies").forEach(function (unit) {
    if (aiFireIfPossible(state, unit)) return
    if (objectiveAt(state, unit.q, unit.r)) return
    if (aiSortie(state, unit)) return
    aiShiftToObjective(state, unit, claims)
  })
  resetPhaseFlags(state, "allies")
}

function checkVictory(state) {
  var axisPts = scoreFor(state, "axis")
  var total = totalObjectivePoints(state)
  var axisAlive = livingUnits(state, "axis").length

  if (axisPts === total) {
    state.gameOver = true
    state.resultText = "Decisive Axis Victory -- every objective town taken by turn " + state.turn + "."
  } else if (axisAlive === 0) {
    state.gameOver = true
    state.resultText = "Axis Defeat -- the Kampfgruppen have been wiped out."
  } else if (state.turn > Scenario.TURN_LIMIT) {
    state.gameOver = true
    if (axisPts >= total * 0.75) state.resultText = "Major Axis Victory -- " + axisPts + "/" + total + " objective points held at the ceasefire."
    else if (axisPts >= total * 0.4) state.resultText = "Minor Axis Victory -- " + axisPts + "/" + total + " objective points held at the ceasefire."
    else if (axisPts > 0) state.resultText = "Draw -- only " + axisPts + "/" + total + " objective points held at the ceasefire."
    else state.resultText = "Allied Victory -- the offensive stalled short of every objective."
  }
  return state.gameOver
}

function endTurn(state) {
  if (state.gameOver) return
  resetPhaseFlags(state, "axis")
  runAlliesPhase(state)
  if (checkVictory(state)) return
  state.turn += 1
  state.selectedUnitId = null
  if (checkVictory(state)) return
  state.log.unshift("Turn " + state.turn + " -- Axis phase.")
  placeReinforcements(state, "axis")
}

// Axis units that can still do something this turn, in a stable order.
function actionableUnits(state) {
  return livingUnits(state, "axis").filter(function (u) { return !u.attacked && !(u.moved && attackTargets(state, u).length === 0) })
}
