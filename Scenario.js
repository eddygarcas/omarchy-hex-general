.pragma library

.import "Hex.js" as Hex

// "Ardennes, Winter 1944" -- a single fixed scenario. A small stand-in for
// the Losheim Gap -> St. Vith -> Bastogne sector: the German player starts
// on the east edge and must push west across the Our/Clerf river line to
// take the objective towns before the turn limit, while Allied
// reinforcements arrive from the west.
//
// Everything here is authored in offset (col, row) coordinates on a
// rectangular "odd-r" map (see Hex.js); buildUnits() converts unit
// positions to axial for the engine.

var WIDTH = 16
var HEIGHT = 10
var TURN_LIMIT = 14

var TERRAIN = {
  clear:  { label: "Snowfield", cost: 1, defBonus: 0, passable: true },
  forest: { label: "Forest",    cost: 2, defBonus: 2, passable: true },
  hills:  { label: "Hills",     cost: 2, defBonus: 2, passable: true },
  town:   { label: "Village",   cost: 1, defBonus: 1, passable: true },
  city:   { label: "Town",      cost: 1, defBonus: 2, passable: true },
  river:  { label: "River",     cost: Infinity, defBonus: 0, passable: false },
  bridge: { label: "Bridge",    cost: 1, defBonus: 0, passable: true }
}

// grid[row][col]
function buildTerrain() {
  var grid = []
  for (var row = 0; row < HEIGHT; row++) {
    var line = []
    for (var col = 0; col < WIDTH; col++) line.push("clear")
    grid.push(line)
  }
  function set(col, row, code) { if (row >= 0 && row < HEIGHT && col >= 0 && col < WIDTH) grid[row][col] = code }

  // The Our/Clerf river line, north-south with a westward jog in the
  // middle -- the chokepoint the Axis player must cross.
  // Consecutive rows must stay hex-adjacent (odd rows sit half a hex to the
  // right), otherwise the line leaks.
  var riverCols = [10, 10, 10, 9, 9, 9, 9, 9, 10, 10]
  for (var r = 0; r < HEIGHT; r++) set(riverCols[r], r, "river")
  // Bridges: the only crossing points.
  set(10, 1, "bridge")
  set(9, 4, "bridge")
  set(10, 8, "bridge")

  // Ardennes forest belt east of the river (Schnee Eifel), plus patches west.
  var forest = [
    [11, 0], [12, 0], [11, 1], [12, 2], [13, 2], [11, 3], [12, 4], [11, 5], [12, 5],
    [11, 6], [12, 7], [11, 7], [11, 8], [12, 8], [13, 4], [13, 6], [12, 9], [11, 9],
    [7, 0], [8, 0], [1, 2], [0, 3], [7, 6], [8, 7], [2, 8], [1, 9], [6, 9], [7, 9]
  ]
  forest.forEach(function (h) { set(h[0], h[1], "forest") })

  // Scattered hills on both banks.
  var hills = [[6, 1], [4, 2], [8, 2], [6, 5], [4, 6], [8, 5], [13, 1], [14, 5], [2, 4], [5, 9]]
  hills.forEach(function (h) { set(h[0], h[1], "hills") })

  // Towns, including the four objective towns.
  set(5, 1, "city")   // St. Vith
  set(8, 4, "town")   // Clervaux
  set(3, 5, "city")   // Houffalize
  set(4, 8, "city")   // Bastogne
  set(7, 7, "town")   // Wiltz
  set(13, 8, "town")  // Dasburg (Axis start)

  return grid
}

// Roads as chains of adjacent offset hexes. Entering a road hex costs 1
// movement point whatever the terrain; bridges carry the road over the river.
var ROADS = [
  [[15, 1], [14, 1], [13, 1], [12, 1], [11, 1], [10, 1], [9, 1], [8, 1], [7, 1], [6, 1], [5, 1], [4, 1], [3, 1], [2, 1], [1, 1], [0, 1]],
  [[15, 4], [14, 4], [13, 4], [12, 4], [11, 4], [10, 4], [9, 4], [8, 4], [7, 4], [6, 4], [5, 4], [4, 4], [3, 5], [2, 5], [1, 5], [0, 5]],
  [[15, 8], [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], [8, 8], [7, 7], [6, 7], [5, 7], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]],
  [[5, 1], [5, 2], [5, 3], [5, 4]],
  [[3, 5], [3, 6], [3, 7], [4, 8]],
  [[8, 4], [8, 5], [8, 6], [7, 7]]
]

var OBJECTIVES = [
  { col: 5, row: 1, name: "St. Vith", points: 3 },
  { col: 8, row: 4, name: "Clervaux", points: 1 },
  { col: 3, row: 5, name: "Houffalize", points: 2 },
  { col: 4, row: 8, name: "Bastogne", points: 4 }
].map(function (o) {
  var a = Hex.offsetToAxial(o.col, o.row)
  return { q: a.q, r: a.r, name: o.name, points: o.points }
})

function makeUnit(id, side, type, name, col, row, strength) {
  var a = Hex.offsetToAxial(col, row)
  return {
    id: id, side: side, type: type, name: name,
    q: a.q, r: a.r, strength: strength || 10, entrenchment: 0,
    moved: false, attacked: false
  }
}

function buildUnits() {
  var units = []
  var n = 0
  function add(side, type, name, col, row, strength) { n++; units.push(makeUnit("u" + n, side, type, name, col, row, strength)) }

  // Axis (player): Kampfgruppen pushing in from the east edge.
  add("axis", "armor", "Kampfgruppe Peiper", 15, 1)
  add("axis", "armor", "1. SS-Panzer-Division", 14, 1)
  add("axis", "armor", "2. Panzer-Division", 15, 3)
  add("axis", "armor", "116. Panzer-Division", 15, 4)
  add("axis", "eliteInfantry", "3. Fallschirmjäger", 15, 5)
  add("axis", "mechInfantry", "Panzergrenadier-Lehr", 15, 6)
  add("axis", "infantry", "18. Volksgrenadier", 14, 2)
  add("axis", "infantry", "26. Volksgrenadier", 14, 7)
  add("axis", "artillery", "Nebelwerfer-Brigade", 14, 8)
  add("axis", "recon", "Aufklärungs-Abteilung", 15, 8)

  // Allies (AI): a thin, green screen on the river line (the 106th and
  // 28th were overstretched and newly arrived), veterans in the rear.
  add("allies", "armor", "7th Armored (CCB)", 4, 1, 8)
  add("allies", "infantry", "106th Infantry Div.", 6, 2, 6)
  add("allies", "infantry", "28th Infantry Div.", 8, 3, 6)
  add("allies", "antiTank", "823rd TD Battalion", 7, 5, 8)
  add("allies", "infantry", "4th Infantry Div.", 8, 8, 7)
  add("allies", "eliteInfantry", "101st Airborne", 4, 8)
  add("allies", "armor", "10th Armored (CCB)", 5, 7, 8)
  add("allies", "artillery", "VIII Corps Artillery", 3, 6, 8)

  return units
}

// Arrivals, placed at the start of that side's phase on the given turn
// (or the nearest free hex if the entry hex is occupied).
var REINFORCEMENTS = [
  { turn: 3, side: "axis",   type: "armor",         name: "Führer-Begleit-Brigade", col: 15, row: 4 },
  { turn: 5, side: "allies", type: "eliteInfantry", name: "82nd Airborne",          col: 0,  row: 2 },
  { turn: 7, side: "allies", type: "armor",         name: "3rd Armored Div.",       col: 0,  row: 5 },
  { turn: 10, side: "allies", type: "armor",        name: "4th Armored (CCA)",      col: 0,  row: 9 }
]
