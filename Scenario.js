.pragma library

.import "Hex.js" as Hex

// "Ardennes, Winter 1944" -- the Battle of the Bulge at regiment /
// Kampfgruppe / combat-command scale. One hex is roughly 4 km, one turn one
// day, from 16 December (turn 1) to 31 December (turn 16). The map runs
// from Monschau (north) to Echternach (south) and from the Our river on
// the German start line (east) to the Meuse (west edge), the prize.
//
// The order of battle follows the historical one (see README): 6th Panzer
// Army in the north, 5th Panzer Army in the centre, 7th Army in the south,
// against V Corps, VIII Corps and the stream of Allied reinforcements that
// arrived day by day.
//
// Everything here is authored in offset (col, row) coordinates on a
// rectangular "odd-r" map (see Hex.js). Rivers and roads are drawn as
// waypoint polylines; a road hex that crosses a river becomes a bridge.

var WIDTH = 26
var HEIGHT = 18
var TURN_LIMIT = 16

var TERRAIN = {
  clear:  { label: "Snowfield", cost: 1, defBonus: 0, passable: true },
  forest: { label: "Forest",    cost: 2, defBonus: 2, passable: true },
  hills:  { label: "Hills",     cost: 2, defBonus: 2, passable: true },
  town:   { label: "Village",   cost: 1, defBonus: 1, passable: true },
  city:   { label: "Town",      cost: 1, defBonus: 2, passable: true },
  river:  { label: "River",     cost: Infinity, defBonus: 0, passable: false },
  bridge: { label: "Bridge",    cost: 1, defBonus: 0, passable: true }
}

// Deterministic per-hex noise so the map is the same every game.
function noise(col, row, salt) {
  var x = Math.sin(col * 12.9898 + row * 78.233 + salt * 37.719) * 43758.5453
  return x - Math.floor(x)
}

// Rivers as polylines of offset waypoints. The Meuse is the whole west
// edge; Allied reinforcements arrive on its east bank.
var RIVERS = [
  [[0, 0], [0, 17]],                                            // Meuse
  [[21, 2], [21, 7], [21, 12], [22, 15]],                       // Our
  [[22, 15], [19, 16], [16, 17]],                               // Sauer / Sûre
  [[15, 3], [13, 4], [11, 5], [9, 3], [8, 0]],                  // Amblève
  [[14, 7], [11, 5]],                                           // Salm
  [[14, 9], [10, 10], [8, 8], [7, 5], [6, 2], [6, 0]],          // Ourthe
  [[18, 8], [18, 11]]                                           // Clerf
]

var ROADS = [
  [[25, 3], [21, 3], [17, 2], [15, 3], [13, 4], [11, 2], [9, 3], [6, 2], [3, 2], [1, 3]],          // Losheim - Malmedy - Spa - Namur
  [[25, 6], [21, 6], [17, 6], [14, 7], [11, 5], [9, 5], [7, 5], [4, 4], [1, 3]],                   // St. Vith - Vielsalm - Werbomont - Namur
  [[17, 6], [14, 9], [10, 10], [7, 9], [5, 11], [3, 10], [1, 11]],                                  // St. Vith - Houffalize - Marche - Dinant
  [[25, 10], [21, 10], [18, 10], [16, 12], [14, 12], [11, 15], [8, 16], [4, 16], [1, 15]],          // Dasburg - Clervaux - Bastogne - Neufchâteau
  [[14, 12], [14, 9]],                                                                             // Bastogne - Houffalize
  [[14, 12], [10, 11], [7, 9]],                                                                    // Bastogne - Marche
  [[25, 15], [22, 16], [19, 15], [16, 14], [14, 12]],                                              // Echternach - Diekirch - Bastogne
  [[9, 5], [8, 8], [7, 9]],                                                                        // Werbomont - Hotton - Marche
  [[14, 7], [14, 9]],                                                                              // Vielsalm - Houffalize
  [[17, 6], [16, 4], [15, 3]],                                                                     // St. Vith - Malmedy
  [[17, 2], [19, 0]],                                                                              // Elsenborn - Monschau
  [[1, 3], [1, 11], [1, 15]]                                                                       // Meuse road
]

// Towns; the ones with points are the objectives.
var TOWNS = [
  { col: 19, row: 0,  name: "Monschau",    kind: "town" },
  { col: 17, row: 2,  name: "Elsenborn",   kind: "town" },
  { col: 15, row: 3,  name: "Malmedy",     kind: "city", points: 2 },
  { col: 13, row: 4,  name: "Stavelot",    kind: "town", points: 1 },
  { col: 11, row: 2,  name: "Spa",         kind: "town" },
  { col: 9,  row: 5,  name: "Werbomont",   kind: "town" },
  { col: 17, row: 6,  name: "St. Vith",    kind: "city", points: 3 },
  { col: 14, row: 7,  name: "Vielsalm",    kind: "town" },
  { col: 14, row: 9,  name: "Houffalize",  kind: "city", points: 2 },
  { col: 10, row: 10, name: "La Roche",    kind: "town", points: 1 },
  { col: 8,  row: 8,  name: "Hotton",      kind: "town" },
  { col: 7,  row: 9,  name: "Marche",      kind: "city", points: 3 },
  { col: 5,  row: 11, name: "Rochefort",   kind: "town", points: 1 },
  { col: 3,  row: 10, name: "Celles",      kind: "town" },
  { col: 1,  row: 11, name: "Dinant",      kind: "city", points: 5 },
  { col: 1,  row: 3,  name: "Namur",       kind: "city", points: 5 },
  { col: 18, row: 10, name: "Clervaux",    kind: "town", points: 1 },
  { col: 16, row: 12, name: "Wiltz",       kind: "town" },
  { col: 14, row: 12, name: "Bastogne",    kind: "city", points: 4 },
  { col: 11, row: 15, name: "Neufchâteau", kind: "town" },
  { col: 19, row: 15, name: "Diekirch",    kind: "town" },
  { col: 22, row: 16, name: "Echternach",  kind: "town" },
  { col: 21, row: 3,  name: "Losheim",     kind: "town" },
  { col: 21, row: 10, name: "Dasburg",     kind: "town" }
]

// Forest belts and ridges: [colMin, colMax, rowMin, rowMax, density].
var FORESTS = [
  [18, 22, 1, 14, 0.55],   // Schnee Eifel and the Eifel forests
  [10, 17, 0, 2, 0.5],     // Hautes Fagnes
  [9, 17, 5, 14, 0.3],     // central Ardennes
  [8, 12, 13, 16, 0.55],   // Forêt de St. Hubert
  [16, 21, 13, 17, 0.35],  // Luxembourg Ardennes
  [2, 8, 0, 17, 0.12]      // Condroz, mostly open farmland
]
var HILLS = [
  [16, 18, 1, 3, 0.6],     // Elsenborn ridge
  [19, 20, 4, 7, 0.7],     // Schnee Eifel ridge
  [0, 25, 0, 17, 0.06]     // scattered
]

function inBox(col, row, box) {
  return col >= box[0] && col <= box[1] && row >= box[2] && row <= box[3]
}

function polyline(points) {
  var out = []
  for (var i = 0; i + 1 < points.length; i++) {
    var a = Hex.offsetToAxial(points[i][0], points[i][1])
    var b = Hex.offsetToAxial(points[i + 1][0], points[i + 1][1])
    Hex.line(a, b).forEach(function (h) {
      var o = Hex.axialToOffset(h.q, h.r)
      if (out.length === 0 || out[out.length - 1][0] !== o.col || out[out.length - 1][1] !== o.row) out.push([o.col, o.row])
    })
  }
  return out
}

// Road chains as adjacent offset hexes (what the engine and renderer use).
var ROAD_CHAINS = ROADS.map(polyline)

// grid[row][col]
function buildTerrain() {
  var grid = []
  for (var row = 0; row < HEIGHT; row++) {
    var line = []
    for (var col = 0; col < WIDTH; col++) {
      var code = "clear"
      FORESTS.forEach(function (box) { if (inBox(col, row, box) && noise(col, row, 1) < box[4]) code = "forest" })
      HILLS.forEach(function (box) { if (inBox(col, row, box) && noise(col, row, 2) < box[4]) code = "hills" })
      line.push(code)
    }
    grid.push(line)
  }
  function set(col, row, code) { if (row >= 0 && row < HEIGHT && col >= 0 && col < WIDTH) grid[row][col] = code }

  RIVERS.forEach(function (pts) { polyline(pts).forEach(function (h) { set(h[0], h[1], "river") }) })
  ROAD_CHAINS.forEach(function (chain) {
    chain.forEach(function (h) { if (grid[h[1]][h[0]] === "river") set(h[0], h[1], "bridge") })
  })
  TOWNS.forEach(function (t) { set(t.col, t.row, t.kind) })
  return grid
}

var OBJECTIVES = TOWNS.filter(function (t) { return t.points }).map(function (t) {
  var a = Hex.offsetToAxial(t.col, t.row)
  return { q: a.q, r: a.r, name: t.name, points: t.points }
})

function townAt(col, row) {
  for (var i = 0; i < TOWNS.length; i++) if (TOWNS[i].col === col && TOWNS[i].row === row) return TOWNS[i]
  return null
}

// xp: starting experience points (3 per bar, 5 bars max -- see Engine).
function makeUnit(id, side, type, name, col, row, strength, xp) {
  var a = Hex.offsetToAxial(col, row)
  return {
    id: id, side: side, type: type, name: name,
    q: a.q, r: a.r, strength: strength || 10, entrenchment: 0, xp: xp || 0,
    moved: false, attacked: false, overrun: false,
    stock: type === "supply" ? 3 : 0    // turns of supply a column carries when cut off
  }
}

function buildUnits() {
  var units = []
  var n = 0
  function add(side, type, name, col, row, strength, xp) { n++; units.push(makeUnit("u" + n, side, type, name, col, row, strength, xp)) }

  // ---- Axis, 16 December ------------------------------------------------
  // 6. Panzerarmee (Dietrich): I. SS-Panzerkorps through the Losheim Gap.
  add("axis", "armor",        "KG Peiper (1. SS-Pz)",        24, 4, 10, 12)
  add("axis", "mechInfantry", "KG Hansen (1. SS-Pz)",        24, 5, 10, 9)
  add("axis", "recon",        "KG Knittel (1. SS-Pz)",       25, 5, 10, 9)
  add("axis", "armor",        "KG Kuhlmann (12. SS-Pz)",     24, 2, 10, 9)
  add("axis", "mechInfantry", "KG Müller (12. SS-Pz)",       25, 2, 10, 6)
  add("axis", "infantry",     "12. Volksgrenadier-Div.",     23, 2, 10, 3)
  add("axis", "infantry",     "277. Volksgrenadier-Div.",    23, 1, 10, 3)
  add("axis", "infantry",     "326. Volksgrenadier-Div.",    22, 0, 10, 0)
  add("axis", "infantry",     "3. Fallschirmjäger-Div.",     23, 4, 10, 3)
  add("axis", "artillery",    "I. SS-Korps Artillerie",      25, 3, 10, 6)
  // 5. Panzerarmee (Manteuffel): LXVI Korps on St. Vith, the Panzerkorps on Bastogne.
  add("axis", "infantry",     "GR 293 (18. VGD)",            22, 6, 10, 3)
  add("axis", "infantry",     "GR 294 (18. VGD)",            22, 7, 10, 3)
  add("axis", "infantry",     "GR 164 (62. VGD)",            22, 8, 10, 3)
  add("axis", "armor",        "Pz.Rgt 16 (116. Pz)",         24, 8, 10, 6)
  add("axis", "mechInfantry", "PzGren 60 (116. Pz)",         24, 9, 10, 6)
  add("axis", "infantry",     "560. Volksgrenadier-Div.",    23, 9, 10, 0)
  add("axis", "armor",        "Pz.Rgt 3 (2. Pz)",            24, 10, 10, 9)
  add("axis", "mechInfantry", "PzGren 304 (2. Pz)",          25, 10, 10, 6)
  add("axis", "recon",        "KG von Böhm (2. Pz)",         23, 11, 10, 6)
  add("axis", "armor",        "Pz.Lehr-Rgt 130 (Pz-Lehr)",   24, 12, 10, 9)
  add("axis", "mechInfantry", "PzGren 902 (Pz-Lehr)",        25, 12, 10, 9)
  add("axis", "infantry",     "GR 39 (26. VGD)",             22, 11, 10, 3)
  add("axis", "infantry",     "GR 77 (26. VGD)",             22, 12, 10, 3)
  add("axis", "artillery",    "Volks-Artillerie-Korps 766",  25, 8, 10, 3)
  add("axis", "artillery",    "Volkswerfer-Brigade 15",      25, 7, 10, 3)
  // 7. Armee (Brandenberger): infantry to cover the southern flank.
  add("axis", "infantry",     "FJR 14 (5. FJD)",             23, 13, 10, 0)
  add("axis", "infantry",     "FJR 15 (5. FJD)",             23, 14, 10, 0)
  add("axis", "infantry",     "GR 914 (352. VGD)",           23, 15, 10, 0)
  add("axis", "infantry",     "276. Volksgrenadier-Div.",    24, 16, 10, 0)
  add("axis", "infantry",     "212. Volksgrenadier-Div.",    25, 16, 10, 3)
  add("axis", "supply",       "Nachschub-Kolonne Nord",      25, 4, 10, 0)
  add("axis", "supply",       "Nachschub-Kolonne Süd",       25, 11, 10, 0)

  // ---- Allies, 16 December -----------------------------------------------
  // V Corps (Gerow): the 99th was green, the 2nd a veteran division.
  add("allies", "infantry",  "395th IR (99th ID)",           19, 0, 10, 0)
  add("allies", "infantry",  "393rd IR (99th ID)",           20, 2, 10, 0)
  add("allies", "infantry",  "394th IR (99th ID)",           20, 3, 10, 0)
  add("allies", "infantry",  "9th IR (2nd ID)",              18, 1, 10, 9)
  add("allies", "infantry",  "38th IR (2nd ID)",             18, 3, 10, 9)
  add("allies", "recon",     "14th Cavalry Group",           20, 4, 8, 3)
  add("allies", "artillery", "V Corps Artillery",            17, 3, 10, 6)
  // VIII Corps (Middleton): overstretched from the Schnee Eifel to the Sauer.
  add("allies", "infantry",  "422nd IR (106th ID)",          20, 5, 10, 0)
  add("allies", "infantry",  "423rd IR (106th ID)",          20, 6, 10, 0)
  add("allies", "infantry",  "424th IR (106th ID)",          19, 7, 10, 0)
  add("allies", "infantry",  "168th Engineer Bn",            17, 6, 5, 3)      // St. Vith
  add("allies", "antiTank",  "811th TD Battalion",           18, 6, 8, 3)
  add("allies", "infantry",  "112th IR (28th ID)",           20, 8, 10, 6)
  add("allies", "infantry",  "110th IR (28th ID)",           19, 10, 10, 6)
  add("allies", "infantry",  "109th IR (28th ID)",           20, 13, 10, 6)
  add("allies", "armor",     "CCR (9th AD)",                 15, 11, 8, 3)
  add("allies", "armor",     "CCA (9th AD)",                 19, 15, 8, 3)     // Diekirch
  add("allies", "infantry",  "12th IR (4th ID)",             20, 15, 10, 9)
  add("allies", "infantry",  "22nd IR (4th ID)",             21, 14, 10, 9)
  add("allies", "artillery", "VIII Corps Artillery",         14, 12, 8, 6)     // Bastogne
  add("allies", "supply",    "Red Ball Express",             10, 7, 10, 0)
  add("allies", "supply",    "VIII Corps Trains",            12, 14, 10, 0)

  return units
}

// Arrivals, placed at the start of that side's phase on the given turn (or
// the nearest free hex if the entry hex is occupied). Allied arrivals land
// where history put them; Axis reserves enter on the east edge.
var REINFORCEMENTS = [
  { turn: 3,  side: "axis",   type: "armor",        name: "Führer-Begleit-Brigade",     col: 25, row: 6,  xp: 9 },
  { turn: 5,  side: "axis",   type: "armor",        name: "KG Das Reich (2. SS-Pz)",    col: 25, row: 5,  xp: 12 },
  { turn: 5,  side: "axis",   type: "mechInfantry", name: "Führer-Grenadier-Brigade",   col: 25, row: 13, xp: 6 },
  { turn: 6,  side: "axis",   type: "armor",        name: "KG Hohenstaufen (9. SS-Pz)", col: 25, row: 4,  xp: 9 },
  { turn: 8,  side: "axis",   type: "armor",        name: "KG 9. Panzer-Division",      col: 25, row: 9,  xp: 6 },
  { turn: 9,  side: "axis",   type: "mechInfantry", name: "KG 15. Panzergrenadier",     col: 25, row: 10, xp: 6 },
  { turn: 9,  side: "axis",   type: "infantry",     name: "79. Volksgrenadier-Div.",    col: 25, row: 14, xp: 0 },
  { turn: 10, side: "axis",   type: "mechInfantry", name: "KG 3. Panzergrenadier",      col: 25, row: 3,  xp: 6 },

  { turn: 2,  side: "allies", type: "armor",        name: "CCB (7th AD)",               col: 16, row: 6,  xp: 6 },
  { turn: 2,  side: "allies", type: "armor",        name: "CCA (7th AD)",               col: 15, row: 6,  xp: 6 },
  { turn: 2,  side: "allies", type: "armor",        name: "CCB (10th AD)",              col: 13, row: 12, xp: 6 },
  { turn: 2,  side: "allies", type: "infantry",     name: "117th IR (30th ID)",         col: 15, row: 2,  xp: 9 },
  { turn: 2,  side: "allies", type: "infantry",     name: "119th IR (30th ID)",         col: 12, row: 4,  xp: 9 },
  { turn: 2,  side: "allies", type: "infantry",     name: "26th IR (1st ID)",           col: 16, row: 2,  xp: 12 },
  { turn: 3,  side: "allies", type: "eliteInfantry", name: "506th PIR (101st Abn)",     col: 14, row: 11, xp: 12 },
  { turn: 3,  side: "allies", type: "eliteInfantry", name: "501st PIR (101st Abn)",     col: 13, row: 13, xp: 12 },
  { turn: 3,  side: "allies", type: "eliteInfantry", name: "502nd PIR (101st Abn)",     col: 13, row: 11, xp: 12 },
  { turn: 3,  side: "allies", type: "infantry",     name: "327th GIR (101st Abn)",      col: 14, row: 13, xp: 9 },
  { turn: 3,  side: "allies", type: "antiTank",     name: "705th TD Battalion",         col: 15, row: 12, xp: 6 },
  { turn: 3,  side: "allies", type: "eliteInfantry", name: "505th PIR (82nd Abn)",      col: 9,  row: 5,  xp: 12 },
  { turn: 3,  side: "allies", type: "eliteInfantry", name: "504th PIR (82nd Abn)",      col: 10, row: 5,  xp: 12 },
  { turn: 3,  side: "allies", type: "armor",        name: "CCR (7th AD)",               col: 16, row: 7,  xp: 6 },
  { turn: 3,  side: "allies", type: "infantry",     name: "120th IR (30th ID)",         col: 14, row: 3,  xp: 9 },
  { turn: 4,  side: "allies", type: "armor",        name: "CCB (3rd AD)",               col: 11, row: 3,  xp: 9 },
  { turn: 4,  side: "allies", type: "eliteInfantry", name: "508th PIR (82nd Abn)",      col: 10, row: 6,  xp: 12 },
  { turn: 4,  side: "allies", type: "infantry",     name: "16th IR (1st ID)",           col: 16, row: 1,  xp: 12 },
  { turn: 5,  side: "allies", type: "armor",        name: "CCA (3rd AD)",               col: 9,  row: 6,  xp: 9 },
  { turn: 5,  side: "allies", type: "infantry",     name: "334th IR (84th ID)",         col: 7,  row: 9,  xp: 3 },
  { turn: 5,  side: "allies", type: "infantry",     name: "335th IR (84th ID)",         col: 6,  row: 9,  xp: 3 },
  { turn: 6,  side: "allies", type: "armor",        name: "CCA (2nd AD)",               col: 4,  row: 8,  xp: 12 },
  { turn: 6,  side: "allies", type: "armor",        name: "CCB (2nd AD)",               col: 4,  row: 9,  xp: 12 },
  { turn: 6,  side: "allies", type: "armor",        name: "29th Armoured Bde (British)", col: 2,  row: 11, xp: 9 },
  { turn: 6,  side: "allies", type: "infantry",     name: "289th IR (75th ID)",         col: 6,  row: 7,  xp: 0 },
  { turn: 7,  side: "allies", type: "armor",        name: "CCA (4th AD)",               col: 12, row: 17, xp: 12 },
  { turn: 7,  side: "allies", type: "armor",        name: "CCB (4th AD)",               col: 13, row: 17, xp: 12 },
  { turn: 7,  side: "allies", type: "armor",        name: "CCR (4th AD)",               col: 11, row: 17, xp: 12 },
  { turn: 7,  side: "allies", type: "infantry",     name: "104th IR (26th ID)",         col: 15, row: 17, xp: 6 },
  { turn: 7,  side: "allies", type: "infantry",     name: "318th IR (80th ID)",         col: 18, row: 17, xp: 6 }
]
