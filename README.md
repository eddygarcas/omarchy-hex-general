# Hex General

A hex-grid, turn-based WWII operational wargame in the spirit of the classic
1990s *Panzer General*, written for [Omarchy](https://omarchy.org/) and any
other Wayland desktop that has [Quickshell](https://quickshell.org/). It runs
as a normal application window and autosaves between turns, so a campaign
survives closing it.

Rather than the whole war, Hex General is about single battles. It ships
with one: **Ardennes, Winter 1944** -- the Battle of the Bulge at regiment,
Kampfgruppe and combat-command scale. One hex is roughly 4 km and one turn
one day, from 16 December (turn 1) to 31 December (turn 16). You command the
German offensive: three armies on the Our river with orders to break through
the Ardennes, take St. Vith and Bastogne, and reach the Meuse at Namur or
Dinant before the fog lifts and the Allied reinforcements arrive.

![Hex General showing the Ardennes map at regiment scale, with unit counters, movement arrows and the battle log](screenshot.png)

## Install

Requires `quickshell` (already there on Omarchy).

```
git clone https://github.com/eddygarcas/omarchy-hex-general.git ~/Work/hex-general
~/Work/hex-general/install.sh
```

That links `hex-general` into `~/.local/bin` and adds a desktop entry, so
the app launcher finds it. Run it with `hex-general`. Optional extras:

```lua
-- ~/.config/hypr/bindings.lua
o.bind("SUPER + SHIFT + H", "Hex General", { launch = "hex-general" })
```

```jsonc
// ~/.config/omarchy/extensions/omarchy-menu.jsonc
"hex-general": {"icon":"󰊗","label":"Hex General","action":"uwsm-app -- hex-general"}
```

Remove with `./install.sh --uninstall` (the save game in
`~/.local/state/hex-general/` is left alone).

## How to play

Each turn you move and attack with every Axis unit, then press **End Turn**.
The Allied side then plays its turn in front of you, one unit at a time --
each counter slides along its move and every shot is shown as a tracer and
an explosion -- before play returns to you. Press **F** to play the Allied
phase at triple speed.

- **Click a unit** to select it. Hexes it can reach are highlighted; enemies
  it can attack get a red ring. **Tab** cycles through units that can still
  act.
- **Click a highlighted hex** to move there. Terrain costs movement points
  (snowfield 1, forest/hills 2, roads always 1, rivers are impassable
  except at bridges), and entering an enemy **zone of control** (any hex
  next to an enemy) ends the move.
- **Objective towns** (yellow ring) fly the flag of whoever moved in last.
  Capturing one keeps it until the enemy takes it back; you do not have to
  garrison it.
- **Click a red-ringed enemy** to attack. Hover it first: the sidebar shows
  the odds. Odds depend on attacker type vs. hard/soft target, both units'
  strength and experience, the defender's terrain, how long it has been
  dug in, and any **support fire** from artillery or anti-tank units next
  to the defender. Units that sit still entrench (up to three levels, shown
  as gold pips).
- **Artillery** fires from up to three hexes away and takes no return fire.
- **Overrun**: a unit that has not moved yet and destroys an adjacent enemy
  may still advance, with half its movement points, to exploit the gap.
- **Experience**: every battle a unit survives earns experience -- one
  point for fighting, two for a kill -- shown as up to five bars under the
  strength box. Each bar is +10% attack and defence. Units start with
  historical seasoning: Peiper's SS and the airborne regiments are
  veterans, the Volksgrenadiers and the 99th/106th are green.
- **Replacements**: a damaged unit that spends a whole turn without moving
  or firing regains one step of strength at the end of it -- as long as it
  can trace a supply line to its own map edge through hexes free of enemy
  units and enemy zones of control (friendly-held hexes count as open).
  A unit that is **cut off** gets a red marker and recovers nothing until
  the pocket is opened again.
- **Supply columns**: each side has unarmed truck columns carrying three
  turns of stock. Friends within two hexes of a stocked column count as in
  supply even inside a pocket, and a unit resting **next to** the column
  takes two replacement steps instead of one. The column refills whenever
  it can trace a supply line itself; cut off, it burns a turn of stock per
  turn. Guard them -- they have almost no defence.
- **Weather** changes every day and is forecast a day ahead. Fog and
  snowstorms ground all aircraft; a snowstorm also costs every unit one
  movement point. Historically the fog lifted on 23 December -- expect
  clear skies from around turn 8.
- **Air support** flies on clear days only. The Allies get four sorties a
  day, aimed at your strongest units in the open; you get two Luftwaffe
  sorties: press **A** (or the button), then click any enemy. A strike
  costs 1-2 steps in the open, only 1 in forest, towns or against dug-in
  troops, and takes no return fire.
- **Movement arrows**: every move of the battle is drawn campaign-map
  style -- red arrows for the Axis, blue for the Allies -- so you can read
  the whole offensive at a glance. Press **M** to hide or show them.
- **Zoom** with **+** / **-** (or Ctrl + mouse wheel), **0** to fit the
  whole map again; drag or scroll to pan.
- **Enter** / **Space** ends the turn. **N** starts a new game. **Esc**
  quits; the game is saved and resumes next launch.

The counters are 48x24 pixel sprites of what each formation actually
fielded (`Sprites.js`), built the way a sprite tool would: each vehicle is
a stack of shaded shapes rasterised to a fixed palette, then outlined,
lit along the top edge and shadowed underneath, and drawn at an integer
pixel scale so they stay crisp when zoomed: Kampfgruppe Peiper's **Tiger II**s, the
Panzer divisions' and Lehr's **Panthers**, **Panzer IV**s for
Führer-Begleit and 9. Panzer, **SdKfz 251** half-tracks, **Puma** armoured
cars, **Pak 40**s, **leFH 18** howitzers and the Werfer brigade's
**Nebelwerfer**s, **Opel Blitz** columns, Volksgrenadiers in the Stahlhelm
and Fallschirmjäger with an MG 42; **M4 Shermans** (75 mm), the **76 mm
M4A3** for 2nd and 4th Armored, a **Firefly** for the British brigade,
**M18 Hellcats** for the 705th and 811th Tank Destroyer Battalions, **M8
Greyhounds**, **105 mm M2A1**s and the corps artillery's **155 mm Long
Tom**s, **GMC** trucks, riflemen in the M1 helmet and paratroopers with
Thompsons. The sidebar names the equipment. Terrain is snow-covered fir
forest, ridges, villages with their churches, curving rivers and the road
net, drawn as vector art.

Victory is judged at the end of each turn on the objective points you hold
(28 in all: St. Vith 3, Bastogne 4, Marche 3, Malmedy, Houffalize 2 each,
Clervaux, Stavelot, La Roche, Rochefort 1 each, and the Meuse bridges at
Namur and Dinant 5 each): 75% is a major victory, 40% a minor one.

### Your own sprite sheets

You can replace any built-in sprite with pixel art of your own. Put a PNG
with a transparent background per side in
`~/.local/share/hex-general/sprites/` and describe the cells in
`sprites.json` next to it:

```json
{
  "axis":   { "file": "axis.png",   "sprites": { "tigerII": [0, 0, 46, 21], "panther": [48, 0, 46, 22] } },
  "allies": { "file": "allies.png", "sprites": { "sherman": [0, 0, 44, 20] } }
}
```

Each entry is `[x, y, width, height]` in the sheet. Sprite names are the
ones in `Sprites.js` (`tigerII`, `panther`, `pzIV`, `sdkfz251`, `puma`,
`pak40`, `lefh18`, `nebelwerfer`, `opelBlitz`, `infantryAxis`,
`fallschirmjaeger`, `sherman`, `sherman76`, `firefly`, `hellcat`,
`m3halftrack`, `greyhound`, `m2a1`, `longTom`, `gmcTruck`,
`infantryAllied`, `paratrooper`). Anything not listed keeps the built-in
sprite. Sheets are drawn at the same integer pixel scale as the built-ins,
so cells of roughly 32-48 pixels wide look right. Nothing in that folder
is part of the game or its repository -- it is your personal art.

## The order of battle

The units are the historical regiments, Kampfgruppen and combat commands
of 16 December 1944 and the days that followed, drawn from the standard
accounts (Cole's *The Ardennes: Battle of the Bulge*, the US Army official
history, and MacDonald's *A Time for Trumpets*), simplified to one counter
per regiment-sized formation:

- **6. Panzerarmee** (north): Kampfgruppen Peiper, Hansen and Knittel of
  1. SS-Panzer-Division, Kuhlmann and Müller of 12. SS, the 12., 277. and
  326. Volksgrenadier divisions, 3. Fallschirmjäger, corps artillery;
  2. SS *Das Reich* and 9. SS *Hohenstaufen* as reserves.
- **5. Panzerarmee** (centre): the 18. and 62. VGD regiments against
  St. Vith; 116. Panzer, 2. Panzer and Panzer-Lehr with the 26. VGD
  regiments toward Bastogne; the Führer-Begleit-Brigade in reserve.
- **7. Armee** (south): 5. Fallschirmjäger, 352., 276. and 212. VGD, the
  Führer-Grenadier-Brigade in reserve.
- **V Corps**: the green 99th and veteran 2nd Infantry regiments on the
  Elsenborn ridge, the 14th Cavalry Group in the Losheim Gap, corps
  artillery; then 1st and 30th Infantry.
- **VIII Corps**: the 106th on the Schnee Eifel, the 28th along the Our,
  the 4th on the Sauer, 9th Armored's three combat commands, engineers and
  tank destroyers; then, day by day, 7th and 10th Armored, the 101st and
  82nd Airborne, 3rd Armored, 84th Infantry, 2nd Armored and the British
  29th Armoured Brigade on the Meuse, and Patton's 4th Armored, 26th and
  80th Infantry from the south.

## Remove

```
~/Work/hex-general/install.sh --uninstall
rm -rf ~/Work/hex-general ~/.local/state/hex-general
```

## License

MIT -- see [LICENSE](LICENSE). All art is drawn procedurally; nothing is
copied from the original game.
