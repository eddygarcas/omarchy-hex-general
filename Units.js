.pragma library

// Unit-type stat table. Values are loosely modeled on the WWII operational
// wargames of the early 1990s (attack/defense/move on a 1-10 scale, hit
// points as "steps" 0-10) -- not any single game's exact numbers.
//
//   atkSoft / atkHard   attack value vs. soft (infantry/artillery) and
//                        hard (armor/anti-tank) targets
//   def                 base defense value
//   move                movement points per turn
//   range               1 = direct-fire/melee, >1 = indirect (artillery):
//                        can fire without the defender striking back
//   initiative           higher acts first when both sides could strike
var TYPES = {
  armor: {
    label: "Armor", glyph: "AR",
    atkSoft: 4, atkHard: 6, def: 5, move: 5, range: 1, initiative: 3
  },
  infantry: {
    label: "Infantry", glyph: "IN",
    atkSoft: 4, atkHard: 2, def: 4, move: 3, range: 1, initiative: 2
  },
  eliteInfantry: {
    label: "Elite Infantry", glyph: "EL",
    atkSoft: 5, atkHard: 3, def: 6, move: 3, range: 1, initiative: 3
  },
  mechInfantry: {
    label: "Mech. Infantry", glyph: "MI",
    atkSoft: 4, atkHard: 3, def: 4, move: 4, range: 1, initiative: 2
  },
  antiTank: {
    label: "Anti-Tank", glyph: "AT",
    atkSoft: 2, atkHard: 6, def: 3, move: 2, range: 1, initiative: 2
  },
  artillery: {
    label: "Artillery", glyph: "AY",
    atkSoft: 5, atkHard: 3, def: 2, move: 2, range: 3, initiative: 1
  },
  recon: {
    label: "Recon", glyph: "RC",
    atkSoft: 2, atkHard: 1, def: 2, move: 6, range: 1, initiative: 4
  },
  // Unarmed (range 0): cannot attack, but keeps nearby units in supply and
  // speeds up their replacements. See Engine.js.
  supply: {
    label: "Supply column", glyph: "SP",
    atkSoft: 0, atkHard: 0, def: 1, move: 4, range: 0, initiative: 0
  }
}

// Units that add defensive support fire to an adjacent friendly defender.
function givesSupportFire(unit) {
  return unit.type === "artillery" || unit.type === "antiTank"
}

function typeOf(unit) {
  return TYPES[unit.type]
}

function isHardTarget(unit) {
  return unit.type === "armor" || unit.type === "antiTank"
}
