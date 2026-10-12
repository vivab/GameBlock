// One ↻ button for both actions. Full magazine (or knife) -> inspect;
// partially empty magazine -> reload; an active reload is never restarted.
export function decideWeaponButtonAction(weapon, player) {
  if (!player?.alive) return 'none';
  if (weapon === 'knife') return 'inspect';
  if (player.reloadingUntil) return 'none';
  if (player.ammo >= player.magazine) return 'inspect';
  if (player.reserve > 0) return 'reload';
  return 'none';
}
