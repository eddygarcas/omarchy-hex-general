.pragma library

.import "Hex.js" as Hex
.import "Units.js" as Units
.import "Scenario.js" as Scenario

function buildRoads() {
  var roads = {}
  Scenario.ROADS.forEach(function (chain) {
    chain.forEach(function (h) { var a = Hex.offsetToAxial(h[0], h[1]); roads[Hex.key(a.q, a.r)] = true })
  })
  return roads
}

function createState() {
  return {
    turn: 1,
    units: Scenario.buildUnits(),
    terrain: Scenario.buildTerrain(),
    roads: buildRoads(),
    objectives: Scenario.OBJECTIVES.map(function (o) {
      return { q: o.q, r: o.r, name: o.name, points: o.points, owner: "allies" }
    }),
    phase: "axis",          // "axis" while the player acts, "allies" during the AI phase
    ai: null,               // per-phase AI bookkeeping, see beginAlliesPhase
    moves: [],              // every move made, for the campaign-map arrows
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

function moveCost(state, q, r) {
  var terrain = terrainAt(state, q, r)
  if (!terrain || !terrain.passable) return Infinity
  return state.roads[Hex.key(q, r)] ? 1 : terrain.cost
}

// Moving onto an objective town captures it; it stays yours until the
// enemy moves in.
function claimObjective(state, unit) {
  var obj = objectiveAt(state, unit.q, unit.r)
  if (obj) obj.owner = unit.side
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
      var stepCost = moveCost(state, n.q, n.r)
      if (stepCost === Infinity) continue
      var occupant = unitAt(state, n.q, n.r)
      if (occupant && occupant.side !== unit.side) continue
      var newCost = current.cost + stepCost
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
  state.moves.push({ unitId: unit.id, side: unit.side, turn: state.turn, from: { q: unit.q, r: unit.r }, to: { q: q, r: r } })
  unit.q = q
  unit.r = r
  unit.moved = true
  unit.entrenchment = 0
  claimObjective(state, unit)
  return true
}

// A unit is in supply if it can trace a path to its own map edge (east
// for the Axis, west for the Allies) through hexes that hold no enemy
// unit and are not in enemy zone of control -- unless a friendly unit
// holds that hex.
function isSupplied(state, unit) {
  var homeCol = unit.side === "axis" ? Scenario.WIDTH - 1 : 0
  var seen = {}
  var stack = [{ q: unit.q, r: unit.r }]
  seen[Hex.key(unit.q, unit.r)] = true
  while (stack.length > 0) {
    var h = stack.pop()
    if (Hex.axialToOffset(h.q, h.r).col === homeCol) return true
    var ns = Hex.neighbors(h.q, h.r)
    for (var i = 0; i < ns.length; i++) {
      var n = ns[i]
      var k = Hex.key(n.q, n.r)
      if (seen[k]) continue
      var terrain = terrainAt(state, n.q, n.r)
      if (!terrain || !terrain.passable) continue
      var occupant = unitAt(state, n.q, n.r)
      if (occupant && occupant.side !== unit.side) continue
      if (!occupant && inEnemyZoc(state, unit.side, n.q, n.r)) continue
      seen[k] = true
      stack.push(n)
    }
  }
  return false
}

// Damaged units that rested (no move, no shot) and are in supply take one
// step of replacements a turn. Cut-off units get nothing.
function replacements(state, side) {
  var recovered = 0, cutOff = 0
  livingUnits(state, side).forEach(function (u) {
    if (u.strength >= 10 || u.moved || u.attacked) return
    if (!isSupplied(state, u)) { cutOff++; return }
    u.strength = Math.min(10, u.strength + 1)
    recovered++
  })
  var who = side === "axis" ? "Axis" : "Allied"
  if (recovered > 0) state.log.unshift("Replacements reach " + recovered + " " + who + " unit" + (recovered > 1 ? "s" : "") + ".")
  if (cutOff > 0) state.log.unshift(cutOff + " " + who + " unit" + (cutOff > 1 ? "s are" : " is") + " cut off from supply -- no replacements.")
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
  return obj.owner
}

function scoreFor(state, side) {
  var pts = 0
  state.objectives.forEach(function (o) { if (objectiveHolder(state, o) === side) pts += o.points })
  return pts
}

function totalObjectivePoints(state) {
  return state.objectives.reduce(function (s, o) { return s + o.points }, 0)
}

// End of a side's turn: replacements, then units that sat still dig in
// (up to 3 levels), then everyone gets a fresh turn.
function resetPhaseFlags(state, side) {
  replacements(state, side)
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
    claimObjective(state, unit)
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

// Towns with the enemy within four hexes and no friendly garrison on them.
function threatenedObjectives(state, side) {
  var enemy = enemyOf(side)
  return state.objectives.filter(function (o) {
    var garrison = unitAt(state, o.q, o.r)
    if (garrison && garrison.side === side) return false
    return livingUnits(state, enemy).some(function (e) { return Hex.distance(e, o) <= 4 })
  })
}

// Artillery always fires (no return fire); everyone else needs odds that
// won't just bleed the unit out.
function aiFireIfPossible(state, unit, events) {
  var targets = attackTargets(state, unit)
  if (targets.length === 0) return false
  targets.sort(function (a, b) { return combatOdds(state, unit, b) - combatOdds(state, unit, a) })
  var odds = combatOdds(state, unit, targets[0])
  if (Units.typeOf(unit).range === 1 && odds < 0.7) return false
  events.push(attackEvent(state, unit, targets[0]))
  return true
}

// Resolves the attack and describes it for the panel's animation.
function attackEvent(state, attacker, defender) {
  var from = { q: attacker.q, r: attacker.r }, to = { q: defender.q, r: defender.r }
  resolveCombat(state, attacker.id, defender.id)
  return { kind: "attack", unitId: attacker.id, targetId: defender.id, from: from, to: to,
           destroyed: defender.strength <= 0, indirect: Units.typeOf(attacker).range > 1 }
}

function moveEvent(state, unit, q, r) {
  var from = { q: unit.q, r: unit.r }
  moveUnit(state, unit.id, q, r)
  return { kind: "move", unitId: unit.id, from: from, to: { q: q, r: r } }
}

function aiSortie(state, unit, events) {
  var type = Units.typeOf(unit)
  if (type.range > 1 || unit.type === "antiTank") return false
  var enemy = nearestEnemy(state, unit, type.move + 1)
  if (!enemy) return false
  var options = reachable(state, unit)
  var best = null, bestScore = 0
  for (var k in options) {
    var h = Hex.parseKey(k)
    if (Hex.distance(h, enemy) !== 1) continue
    var odds = combatOdds(state, unit, enemy)
    var score = odds + terrainAt(state, h.q, h.r).defBonus * 0.1
    if (odds >= 1.0 && score > bestScore) { bestScore = score; best = h }
  }
  if (!best) return false
  state.log.unshift(unit.name + " advances to engage " + enemy.name + ".")
  events.push(moveEvent(state, unit, best.q, best.r))
  aiFireIfPossible(state, unit, events)
  return true
}

// At most two units answer a call for any one town per phase, and only
// from nearby -- otherwise the whole line strips itself to plug one gap.
function aiShiftToObjective(state, unit, claims, events) {
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
  state.log.unshift(unit.name + " moves to cover " + target.name + ".")
  events.push(moveEvent(state, unit, best.q, best.r))
  aiFireIfPossible(state, unit, events)
  return true
}

// The Allied phase runs one unit at a time so the panel can animate each
// unit's move and shot before the next unit acts:
//   beginAlliesPhase -> aiStep (repeat until null) -> finishAlliesPhase
function beginAlliesPhase(state) {
  state.phase = "allies"
  state.log.unshift("-- Allied phase --")
  placeReinforcements(state, "allies")
  state.ai = { pending: livingUnits(state, "allies").map(function (u) { return u.id }), claims: {} }
}

// Returns the events (moves/attacks) of the next unit that does something,
// or null when every unit has acted.
function aiStep(state) {
  var ai = state.ai
  if (!ai) return null
  while (ai.pending.length > 0) {
    var unit = unitById(state, ai.pending.shift())
    if (!unit || unit.strength <= 0) continue
    var events = []
    if (aiFireIfPossible(state, unit, events)) return events
    if (objectiveAt(state, unit.q, unit.r)) continue
    if (aiSortie(state, unit, events)) return events
    if (aiShiftToObjective(state, unit, ai.claims, events)) return events
  }
  return null
}

function finishAlliesPhase(state) {
  state.ai = null
  state.phase = "axis"
  resetPhaseFlags(state, "allies")
  if (checkVictory(state)) return
  state.turn += 1
  state.selectedUnitId = null
  if (checkVictory(state)) return
  state.log.unshift("Turn " + state.turn + " -- Axis phase.")
  placeReinforcements(state, "axis")
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

// Whole Allied phase in one go (no animation) -- used by headless tests.
function endTurn(state) {
  if (state.gameOver) return
  resetPhaseFlags(state, "axis")
  beginAlliesPhase(state)
  while (aiStep(state)) {}
  finishAlliesPhase(state)
}

// Axis units that can still do something this turn, in a stable order.
function actionableUnits(state) {
  return livingUnits(state, "axis").filter(function (u) { return !u.attacked && !(u.moved && attackTargets(state, u).length === 0) })
}
