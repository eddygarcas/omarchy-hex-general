.pragma library

// Pixel sprites, 32 x 16, side view facing right. One character per
// pixel; see PALETTE for the meaning. Hand-drawn after the real vehicles
// and kit of the Ardennes, December 1944.
//
//   .  transparent      K  outline          B  body colour      D  body shadow
//   L  body highlight   T  track / tyre     W  road wheel       G  gun barrel
//   X  white            S  skin             H  helmet           U  uniform
//   Y  wood / tan       C  canvas tilt      N  glass            R  red

var SPRITES = {

  // --- German armour ------------------------------------------------------
  // Tiger II: huge boxy hull, Henschel turret, 8.8 cm L/71 with muzzle brake.
  tigerII: [
    "................................",
    "........KKKKKKKKKKKKK...........",
    ".......KLLLLLLLLLLLLDK..........",
    "......KLBBBBBBBBBBBBDDK.........",
    "......KBBBBKXKBBBBBBDDKKKKKKKKKK",
    "......KBBBBBBBBBBBBBDDKGGGGGGGKK",
    ".....KKBBBBBBBBBBBBBBDKKKKKKKKKK",
    "....KKKKKKKKKKKKKKKKKKKKKKKKKKK.",
    "...KLLLLLLLLLLLLLLLLLLLLLLLLLLLK",
    "..KBBBBBBBBBBBBBBBBBBBBBBBBBBBBK",
    "..KBBBBBBBBBBBBBBBBBBBBBBBBBBDDK",
    "..KDDDDDDDDDDDDDDDDDDDDDDDDDDDDK",
    "..KKTTTTTTTTTTTTTTTTTTTTTTTTTTKK",
    ".KTWWTWWTWWTWWTWWTWWTWWTWWTWWTK.",
    ".KTWWTWWTWWTWWTWWTWWTWWTWWTWWTK.",
    "..KKKKKKKKKKKKKKKKKKKKKKKKKKKK..",
  ],

  // Panther: sloped glacis, turret set back, long 7.5 cm L/70, interleaved wheels.
  panther: [
    "................................",
    "................................",
    "........KKKKKKKKKK..............",
    ".......KLLLLLLLLLDK.............",
    "......KLBBBKXKBBBBDKKKKKKKKKKKK.",
    "......KBBBBBBBBBBBDKGGGGGGGGGKK.",
    ".....KKBBBBBBBBBBBBDKKKKKKKKKKK.",
    "....KKKKKKKKKKKKKKKKKKKKKKKK....",
    "...KLLLLLLLLLLLLLLLLLLLLLLLLKK..",
    "..KBBBBBBBBBBBBBBBBBBBBBBBBBBBK.",
    "..KBBBBBBBBBBBBBBBBBBBBBBBBBBDDK",
    "..KDDDDDDDDDDDDDDDDDDDDDDDDDDDDK",
    "..KKTTTTTTTTTTTTTTTTTTTTTTTTTTKK",
    ".KTWWWTWWWTWWWTWWWTWWWTWWWTWWWK.",
    ".KTWWWTWWWTWWWTWWWTWWWTWWWTWWWK.",
    "..KKKKKKKKKKKKKKKKKKKKKKKKKKKK..",
  ],

  // Panzer IV: boxy hull and turret, shorter 7.5 cm L/48, eight small wheels.
  pzIV: [
    "................................",
    "................................",
    ".........KKKKKKKKKK.............",
    "........KLLLLLLLLLDK............",
    "........KBBBKXKBBBDKKKKKKKKKK...",
    "........KBBBBBBBBBDKGGGGGGGGK...",
    "........KBBBBBBBBBDKKKKKKKKKK...",
    ".....KKKKKKKKKKKKKKKKKKKKK......",
    "....KLLLLLLLLLLLLLLLLLLLLKK.....",
    "...KBBBBBBBBBBBBBBBBBBBBBBBK....",
    "...KBBBBBBBBBBBBBBBBBBBBBBDDK...",
    "...KDDDDDDDDDDDDDDDDDDDDDDDDK...",
    "...KKTTTTTTTTTTTTTTTTTTTTTTKK...",
    "..KTWWTWWTWWTWWTWWTWWTWWTWWTK...",
    "..KTWWTWWTWWTWWTWWTWWTWWTWWTK...",
    "...KKKKKKKKKKKKKKKKKKKKKKKKK....",
  ],

  // SdKfz 251: angular open-topped half-track, MG 34 forward.
  sdkfz251: [
    "................................",
    "................................",
    "................................",
    "................KKGGGK..........",
    ".....KKKKKKKKKKKKKKKKK..........",
    "....KLLLLLLLLLLLLLLLLDK.........",
    "...KBBBBBBBBBBBBBBBBBBDKKKKKK...",
    "...KBBBBBBBBBBBBBBBBBBBDLLLLDK..",
    "...KBBBBBBBBBBBBBBBBBBBDBBBBDDK.",
    "...KDDDDDDDDDDDDDDDDDDDDBBBBBDDK",
    "...KKDDDDDDDDDDDDDDDDDDKDDDDDDDK",
    "....KKTTTTTTTTTTTTTTTKKKKKKTTKKK",
    "...KTWWTWWTWWTWWTWWTK...KTWWWTK.",
    "...KTWWTWWTWWTWWTWWTK...KTWWWTK.",
    "....KKKKKKKKKKKKKKKK.....KKKKK..",
    "................................",
  ],

  // SdKfz 234 Puma: eight-wheeled armoured car, small turret, 5 cm gun.
  puma: [
    "................................",
    "................................",
    "................................",
    "...........KKKKKKKK.............",
    "..........KLLLLLLLDKKKKKKKK.....",
    "..........KBBBBBBBDKGGGGGGK.....",
    "......KKKKKBBBBBBBDKKKKKKKK.....",
    ".....KLLLLLLLLLLLLLLLLLLLLKK....",
    "....KBBBBBBBBBBBBBBBBBBBBBBBK...",
    "...KBBBBBBBBBBBBBBBBBBBBBBBBDK..",
    "...KDDDDDDDDDDDDDDDDDDDDDDDDDDK.",
    "...KKKKTTKKKKTTKKKKTTKKKKTTKKKK.",
    "....KTWWWTKKTWWWTKKTWWWTKKTWWWTK",
    "....KTWWWTK.KTWWWTKKTWWWTKKTWWWK",
    ".....KTTTK...KTTTK..KTTTK...KTTK",
    "......KKK.....KKK....KKK.....KK.",
  ],

  // Pak 40: 7.5 cm anti-tank gun, shield, split trail, muzzle brake.
  pak40: [
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
    "..........KKKKK.................",
    ".........KLLLLBK.......KKKKKKK..",
    ".........KBBBBBBKKKKKKKGGGGGGKK.",
    "........KBBBBBBBBGGGGGGGKKKKKKK.",
    "........KBBBBBBBBBKKKKKK........",
    "KKKKK..KBBBBBBBBBBK.............",
    ".KYYYKKKKKBBBBBBBBBK............",
    "...KYYYYKKTTKKKKTTKKK...........",
    ".....KYYKTWWTKKTWWTK............",
    ".......KKTWWTKKTWWTK............",
    ".........KTTK..KTTK.............",
  ],

  // 10.5 cm leFH 18 howitzer: big spoked wheels, shield, barrel raised.
  lefh18: [
    "................................",
    "................................",
    "................................",
    "......................KKK.......",
    "....................KKGGK.......",
    "..........KKKKK...KKGGGK........",
    ".........KLLLLBKKKGGGKK.........",
    ".........KBBBBBBGGGKK...........",
    "........KBBBBBBGGGK.............",
    "........KBBBBBBBBBK.............",
    "KKKKK..KBBBBBBBBBBK.............",
    ".KYYYKKKKKBBBBBBBBBK............",
    "...KYYYYKKTTTTKKKKKK............",
    ".....KYYKTWWWWTKK...............",
    ".......KKTWWWWTK................",
    ".........KTTTTK.................",
  ],

  // Nebelwerfer 41: six tubes on a Pak 35/36 carriage.
  nebelwerfer: [
    "................................",
    "................................",
    "................................",
    "......................KKKK......",
    "....................KKGGGK......",
    "..................KKGGGKKKK.....",
    "................KKGGGKKGGGK.....",
    "..............KKGGGKKGGGKK......",
    "............KKGGGKKGGGKK........",
    "..........KKKGGKKGGGKK..........",
    ".........KLLKKKKGGKK............",
    "KKKK....KBBBBBKKKK..............",
    ".KYYKKKKKBBBBBBK................",
    "...KYYYKKTTKKKTTKK..............",
    ".....KKKTWWTKTWWTK..............",
    "........KTTK.KTTK...............",
  ],

  // Opel Blitz 3-ton: canvas-tilted bed, snub cab.
  opelBlitz: [
    "................................",
    "................................",
    "................................",
    "....KKKKKKKKKKKKKKKKKK..........",
    "...KCCCCCCCCCCCCCCCCCCK.........",
    "...KCCCCCCCCCCCCCCCCCCK.........",
    "...KCCCCCCCCCCCCCCCCCCKKKKKKK...",
    "...KCCCCCCCCCCCCCCCCCCKBNNNBDK..",
    "...KCCCCCCCCCCCCCCCCCCKBNNNBDDK.",
    "...KKKKKKKKKKKKKKKKKKKKBBBBBDDDK",
    "...KBBBBBBBBBBBBBBBBBBKBBBBBBDDK",
    "...KDDDDDDDDDDDDDDDDDDKDDDDDDDDK",
    "...KKKKTTKKKKTTKKKKKKKKKKKTTKKKK",
    "......KTWWTKKTWWTK.......KTWWTK.",
    "......KTWWTKKTWWTK.......KTWWTK.",
    ".......KKKK..KKKK.........KKKK..",
  ],

  // --- American armour ----------------------------------------------------
  // M4 Sherman (75 mm): tall hull, cast turret, three bogies.
  sherman: [
    "................................",
    "..........KKKKKKKK..............",
    ".........KLLLLLLLLK.............",
    "........KLBBBBBBBBBK............",
    "........KBBBKXKBBBBDKKKKKKKKKK..",
    "........KBBBBBBBBBBDKGGGGGGGGK..",
    "........KBBBBBBBBBBDKKKKKKKKKK..",
    ".....KKKKKKKKKKKKKKKKKKKKKKK....",
    "....KLLLLLLLLLLLLLLLLLLLLLLKK...",
    "...KBBBBBBBBBBBBBBBBBBBBBBBBBK..",
    "...KBBBBBBBBBBBBBBBBBBBBBBBBDDK.",
    "...KBBBBBBBBBBBBBBBBBBBBBBBBBDDK",
    "...KDDDDDDDDDDDDDDDDDDDDDDDDDDDK",
    "...KKTWWTKKKTWWTKKKTWWTKKKKTWWKK",
    "....KTWWTK.KTWWTK.KTWWTK..KTWWK.",
    ".....KKKK...KKKK...KKKK....KKK..",
  ],

  // M4A3 (76 mm): the same tank with the long gun and muzzle brake.
  sherman76: [
    "................................",
    "..........KKKKKKKK..............",
    ".........KLLLLLLLLK.............",
    "........KLBBBBBBBBBK............",
    "........KBBBKXKBBBBDKKKKKKKKKKKK",
    "........KBBBBBBBBBBDKGGGGGGGGGKK",
    "........KBBBBBBBBBBDKKKKKKKKKKKK",
    ".....KKKKKKKKKKKKKKKKKKKKKKK....",
    "....KLLLLLLLLLLLLLLLLLLLLLLKK...",
    "...KBBBBBBBBBBBBBBBBBBBBBBBBBK..",
    "...KBBBBBBBBBBBBBBBBBBBBBBBBDDK.",
    "...KBBBBBBBBBBBBBBBBBBBBBBBBBDDK",
    "...KDDDDDDDDDDDDDDDDDDDDDDDDDDDK",
    "...KKTWWTKKKTWWTKKKTWWTKKKKTWWKK",
    "....KTWWTK.KTWWTK.KTWWTK..KTWWK.",
    ".....KKKK...KKKK...KKKK....KKK..",
  ],

  // Sherman Firefly: 17-pounder, counterweight box on the turret rear.
  firefly: [
    "................................",
    ".......KKKKKKKKKKK..............",
    "......KDDKLLLLLLLLK.............",
    "......KDDKBBBBBBBBBK............",
    "......KDDKBBBBBBBBBDKKKKKKKKKKKK",
    "......KKKKBBBBBBBBBDKGGGGGGGGGGK",
    "........KBBBBBBBBBBDKKKKKKKKKKKK",
    ".....KKKKKKKKKKKKKKKKKKKKKKK....",
    "....KLLLLLLLLLLLLLLLLLLLLLLKK...",
    "...KBBBBBBBBBBBBBBBBBBBBBBBBBK..",
    "...KBBBBBBBBBBBBBBBBBBBBBBBBDDK.",
    "...KBBBBBBBBBBBBBBBBBBBBBBBBBDDK",
    "...KDDDDDDDDDDDDDDDDDDDDDDDDDDDK",
    "...KKTWWTKKKTWWTKKKTWWTKKKKTWWKK",
    "....KTWWTK.KTWWTK.KTWWTK..KTWWK.",
    ".....KKKK...KKKK...KKKK....KKK..",
  ],

  // M18 Hellcat: low, fast, open-topped turret, big road wheels.
  hellcat: [
    "................................",
    "................................",
    "................................",
    "..........KKKKKKKKK.............",
    ".........KLBBBBBBBDKKKKKKKKKKKK.",
    ".........KBBBKXKBBDKGGGGGGGGGKK.",
    ".........KBBBBBBBBDKKKKKKKKKKKK.",
    "......KKKKKKKKKKKKKKKKKKKKKK....",
    ".....KLLLLLLLLLLLLLLLLLLLLLLKK..",
    "....KBBBBBBBBBBBBBBBBBBBBBBBBBK.",
    "....KBBBBBBBBBBBBBBBBBBBBBBBBDDK",
    "....KDDDDDDDDDDDDDDDDDDDDDDDDDDK",
    "...KKTWWWTKTWWWTKTWWWTKTWWWTKKK.",
    "...KTWWWWWTWWWWWTWWWWWTWWWWWTK..",
    "...KTWWWWWTWWWWWTWWWWWTWWWWWTK..",
    "....KKKKKKKKKKKKKKKKKKKKKKKKK...",
  ],

  // M3 half-track: rounded bonnet, ring-mounted .50 cal.
  m3halftrack: [
    "................................",
    "................................",
    "................................",
    "...........KKGGGK...............",
    ".....KKKKKKKKKKKKKKKKK..........",
    "....KLLLLLLLLLLLLLLLLLK.........",
    "...KBBBBBBBBBBBBBBBBBBBKKKKKKK..",
    "...KBBBBBBBBBBBBBBBBBBBKLLLLLDK.",
    "...KBBBBBBBBBBBBBBBBBBBKBBBBBDDK",
    "...KDDDDDDDDDDDDDDDDDDDKBBBBBDDK",
    "...KKDDDDDDDDDDDDDDDDDKKDDDDDDDK",
    "....KKTTTTTTTTTTTTTTTKKKKKKTTKKK",
    "...KTWWTWWTWWTWWTWWTK...KTWWWTK.",
    "...KTWWTWWTWWTWWTWWTK...KTWWWTK.",
    "....KKKKKKKKKKKKKKKK.....KKKKK..",
    "................................",
  ],

  // M8 Greyhound: six wheels, open-topped turret with the 37 mm.
  greyhound: [
    "................................",
    "................................",
    "................................",
    "............KKKKKKK.............",
    "...........KLLLLLLDKKKKKKK......",
    "...........KBBBBBBDKGGGGGK......",
    ".......KKKKKBBBBBBDKKKKKKK......",
    "......KLLLLLLLLLLLLLLLLLLLKK....",
    ".....KBBBBBBBBBBBBBBBBBBBBBBK...",
    "....KBBBBBBBBBBBBBBBBBBBBBBBDK..",
    "....KDDDDDDDDDDDDDDDDDDDDDDDDDK.",
    "....KKKKTTKKKKKTTKKKKKKKKKTTKKK.",
    ".....KTWWWTKKKTWWWTKKKKKKTWWWTK.",
    ".....KTWWWTK.KTWWWTK....KTWWWTK.",
    "......KTTTK...KTTTK......KTTTK..",
    ".......KKK.....KKK........KKK...",
  ],

  // 105 mm M2A1 howitzer: split trail, shield, pneumatic tyres.
  m2a1: [
    "................................",
    "................................",
    "................................",
    ".....................KKK........",
    "...................KKGGK........",
    "..........KKKKK..KKGGGK.........",
    ".........KLLLLBKKKGGGKK.........",
    ".........KBBBBBBGGGKK...........",
    "........KBBBBBBGGGK.............",
    "........KBBBBBBBBBK.............",
    "KKKKK..KBBBBBBBBBBK.............",
    ".KYYYKKKKKBBBBBBBBBK............",
    "...KYYYYKKTTTTKKKKKK............",
    ".....KYYKTWWWWTKK...............",
    ".......KKTWWWWTK................",
    ".........KTTTTK.................",
  ],

  // 155 mm M1 "Long Tom": corps artillery, long barrel, tall carriage.
  longTom: [
    "................................",
    "................................",
    "..........................KKK...",
    "........................KKGGK...",
    "......................KKGGGK....",
    "....................KKGGGKK.....",
    "..........KKKKK...KKGGGKK.......",
    ".........KLLLLBKKKGGGKK.........",
    ".........KBBBBBBGGGKK...........",
    "........KBBBBBBGGGK.............",
    "KKKKKK.KBBBBBBBBBBK.............",
    ".KYYYYKKKKBBBBBBBBBK............",
    "...KYYYYYKKTTTTKKKKKK...........",
    ".....KYYYKTWWWWWTKK.............",
    ".......KKKTWWWWWTK..............",
    "..........KTTTTTK...............",
  ],

  // GMC CCKW 2.5-ton: canvas bed, rounded bonnet.
  gmcTruck: [
    "................................",
    "................................",
    "................................",
    "....KKKKKKKKKKKKKKKKK...........",
    "...KCCCCCCCCCCCCCCCCCK..........",
    "...KCCCCCCCCCCCCCCCCCK..........",
    "...KCCCCCCCCCCCCCCCCCKKKKKK.....",
    "...KCCCCCCCCCCCCCCCCCKBNNNBK....",
    "...KCCCCCCCCCCCCCCCCCKBNNNBKKKK.",
    "...KKKKKKKKKKKKKKKKKKKBBBBBBLLDK",
    "...KBBBBBBBBBBBBBBBBBKBBBBBBBBDK",
    "...KDDDDDDDDDDDDDDDDDKDDDDDDDDDK",
    "...KKKKTTKKKKTTKKKKKKKKKKTTKKKKK",
    "......KTWWTKKTWWTK......KTWWTK..",
    "......KTWWTKKTWWTK......KTWWTK..",
    ".......KKKK..KKKK........KKKK...",
  ],

  // --- infantry: three riflemen, helmet shape per nation -------------------
  // German Volksgrenadiers, Stahlhelm and Kar 98k.
  infantryAxis: [
    "................................",
    "................................",
    "....KKK.........KKK......KKK....",
    "...KHHHK.......KHHHK....KHHHK...",
    "..KHHHHHK.....KHHHHHK..KHHHHHK..",
    "..KKSSSKK.....KKSSSKK..KKSSSKK..",
    "...KSSSK...KK..KSSSK.KK.KSSSK...",
    "..KUUUUUK.KGK.KUUUUUKKGKUUUUUK..",
    ".KUUUUUUUKGK.KUUUUUUUGK.KUUUUUK.",
    ".KUUUUUUKGK..KUUUUUUGK..KUUUUUUK",
    ".KUUUUUUGK...KUUUUUGK...KUUUUUUK",
    "..KUUUUUK.....KUUUUK.....KUUUUK.",
    "..KUUKUUK.....KUUKUK.....KUUKUUK",
    "..KUUKUUK.....KUUKUK.....KUUKUUK",
    "..KKKKKKK.....KKKKKK.....KKKKKKK",
    "................................",
  ],

  // Fallschirmjäger: rimless paratrooper helmet, MG 42 on the flank.
  fallschirmjaeger: [
    "................................",
    "................................",
    "....KKK.........KKK.............",
    "...KHHHK.......KHHHK............",
    "...KHHHK.......KHHHK............",
    "...KSSSK.......KSSSK............",
    "...KSSSK...KK..KSSSK............",
    "..KUUUUUK.KGK.KUUUUUKK..........",
    ".KUUUUUUUKGK.KUUUUUUUGKK........",
    ".KUUUUUUKGK..KUUUUUUUUGK..KKK...",
    ".KUUUUUUGK...KUUUUUUUGK..KHHHK..",
    "..KUUUUUK.....KUUUUUK.KKKKSSSKK.",
    "..KUUKUUK.....KUUKUUK.KGGGGUUUUK",
    "..KUUKUUK.....KUUKUUK..KKKUUUUUK",
    "..KKKKKKK.....KKKKKKK...KKKKKKKK",
    "................................",
  ],

  // US riflemen: rounded M1 helmet, M1 Garand.
  infantryAllied: [
    "................................",
    "................................",
    "....KKK.........KKK......KKK....",
    "...KHHHK.......KHHHK....KHHHK...",
    "..KHHHHHK.....KHHHHHK..KHHHHHK..",
    "..KKHHHKK.....KKHHHKK..KKHHHKK..",
    "...KSSSK...KK..KSSSK.KK.KSSSK...",
    "..KUUUUUK.KGK.KUUUUUKKGKUUUUUK..",
    ".KUUUUUUUKGK.KUUUUUUUGK.KUUUUUK.",
    ".KUUUUUUKGK..KUUUUUUGK..KUUUUUUK",
    ".KUUUUUUGK...KUUUUUGK...KUUUUUUK",
    "..KUUUUUK.....KUUUUK.....KUUUUK.",
    "..KUUKUUK.....KUUKUK.....KUUKUUK",
    "..KUUKUUK.....KUUKUK.....KUUKUUK",
    "..KKKKKKK.....KKKKKK.....KKKKKKK",
    "................................",
  ],

  // US paratroopers: M1C helmet with chin cup, Thompson, one prone with a BAR.
  paratrooper: [
    "................................",
    "................................",
    "....KKK.........KKK.............",
    "...KHHHK.......KHHHK............",
    "..KHHHHHK.....KHHHHHK...........",
    "..KKHHHKK.....KKHHHKK...........",
    "...KSSSK.......KSSSK............",
    "..KUUUUUKKK...KUUUUUKKK.........",
    ".KUUUUUUUGGK.KUUUUUUUGGK........",
    ".KUUUUUUUKK..KUUUUUUUKK...KKK...",
    ".KUUUUUUK....KUUUUUUK....KHHHHK.",
    "..KUUUUUK.....KUUUUUK.KKKKKSSSK.",
    "..KUUKUUK.....KUUKUUK.KGGGGUUUUK",
    "..KUUKUUK.....KUUKUUK..KKKUUUUUK",
    "..KKKKKKK.....KKKKKKK...KKKKKKKK",
    "................................",
  ]
}

// Per-side colours for the palette letters. Winter 1944: German vehicles
// in dunkelgelb with whitewash, US in olive drab.
var PALETTES = {
  axis: {
    K: "#15150f", B: "#7d7660", D: "#55503f", L: "#a39c85", T: "#2a2823", W: "#6a675d",
    G: "#3a3934", X: "#f2f2ec", S: "#d9b596", H: "#4c4e46", U: "#5f6350", Y: "#8a6a3c", C: "#a89f86", N: "#9fb7c6", R: "#b3261e"
  },
  allies: {
    K: "#15150f", B: "#5e6a3e", D: "#3d4628", L: "#84905b", T: "#2a2823", W: "#5b5a50",
    G: "#3a3934", X: "#f2f2ec", S: "#d9b596", H: "#4e5a36", U: "#6b7047", Y: "#8a6a3c", C: "#8c8a68", N: "#9fb7c6", R: "#b3261e"
  }
}

var WIDTH = 32, HEIGHT = 16

// Which sprite a unit uses: by side and type, refined by formation name to
// what that formation actually fielded.
function spriteFor(unit) {
  var n = unit.name
  if (unit.side === "axis") {
    switch (unit.type) {
      case "armor":
        if (/Peiper/.test(n)) return "tigerII"                       // s.SS-Pz.Abt 501 rode with Peiper
        if (/Führer-Begleit|9\. Panzer/.test(n)) return "pzIV"
        return "panther"
      case "mechInfantry": return "sdkfz251"
      case "recon": return "puma"
      case "antiTank": return "pak40"
      case "artillery": return /[Ww]erfer/.test(n) ? "nebelwerfer" : "lefh18"
      case "supply": return "opelBlitz"
      case "eliteInfantry": return "fallschirmjaeger"
      default: return /Fallschirmj|FJR|FJD/.test(n) ? "fallschirmjaeger" : "infantryAxis"
    }
  }
  switch (unit.type) {
    case "armor":
      if (/British|Armoured/.test(n)) return "firefly"
      if (/2nd AD|4th AD/.test(n)) return "sherman76"
      return "sherman"
    case "mechInfantry": return "m3halftrack"
    case "recon": return "greyhound"
    case "antiTank": return "hellcat"                                 // 705th and 811th TD Bns had M18s
    case "artillery": return /Corps/.test(n) ? "longTom" : "m2a1"
    case "supply": return "gmcTruck"
    case "eliteInfantry": return "paratrooper"
    default: return "infantryAllied"
  }
}

// Human-readable equipment name for the sidebar.
var LABELS = {
  tigerII: "Tiger II heavy tanks", panther: "Panther tanks", pzIV: "Panzer IV tanks", sdkfz251: "SdKfz 251 half-tracks",
  puma: "SdKfz 234 Puma armoured cars", pak40: "7.5 cm Pak 40", lefh18: "10.5 cm leFH 18 howitzers", nebelwerfer: "15 cm Nebelwerfer 41",
  opelBlitz: "Opel Blitz trucks", sherman: "M4 Sherman (75 mm)", sherman76: "M4A3 Sherman (76 mm)", firefly: "Sherman Firefly (17-pdr)",
  hellcat: "M18 Hellcat tank destroyers", m3halftrack: "M3 half-tracks", greyhound: "M8 Greyhound armoured cars",
  m2a1: "105 mm M2A1 howitzers", longTom: "155 mm M1 Long Tom", gmcTruck: "GMC CCKW trucks",
  infantryAxis: "Volksgrenadiers", fallschirmjaeger: "Fallschirmjäger", infantryAllied: "Riflemen", paratrooper: "Paratroopers"
}

function labelFor(unit) {
  return LABELS[spriteFor(unit)] || ""
}

// Run-length rows: [[x, len, colourChar], ...] per row, built once per sprite.
var _runs = {}

function runsOf(name) {
  if (_runs[name]) return _runs[name]
  var rows = SPRITES[name], out = []
  for (var y = 0; y < rows.length; y++) {
    var row = rows[y], runs = [], x = 0
    while (x < row.length) {
      var c = row[x]
      if (c === ".") { x++; continue }
      var start = x
      while (x < row.length && row[x] === c) x++
      runs.push([start, x - start, c])
    }
    out.push(runs)
  }
  _runs[name] = out
  return out
}

// Draw a sprite centred on (cx, cy) at an integer pixel scale.
function draw(ctx, name, side, cx, cy, scale) {
  var runs = runsOf(name)
  var pal = PALETTES[side] || PALETTES.axis
  var x0 = Math.round(cx - WIDTH * scale / 2), y0 = Math.round(cy - HEIGHT * scale / 2)
  for (var y = 0; y < runs.length; y++) {
    var row = runs[y]
    for (var i = 0; i < row.length; i++) {
      ctx.fillStyle = pal[row[i][2]] || "#f0f"
      ctx.fillRect(x0 + row[i][0] * scale, y0 + y * scale, row[i][1] * scale, scale)
    }
  }
}
