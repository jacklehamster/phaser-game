
function getUnlockedStorage() {
  return JSON.parse(localStorage.getItem("troll-levels-unlocked") ?? "{}");
}

export function unlockedLevel(level: string) {
  if (!level?.length) {
    return false;
  }
  const levelsUnlocked = getUnlockedStorage();
  //    console.log(levelsUnlocked, `level-${level}`, levelsUnlocked[`level-${level}`]);
  return levelsUnlocked[`level-${level}`];
}

export function unlockLevel(level: string) {
  const levelsUnlocked = getUnlockedStorage();
  levelsUnlocked[`level-${level}`] = Date.now();
  localStorage.setItem("troll-levels-unlocked", JSON.stringify(levelsUnlocked));
}
