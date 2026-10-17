// SAMPLE DATA. These entries are placeholders so the leaderboard has
// something to show. Replace this array with real results before launch.
//
// One record per player:
//   name    Minecraft username (premium and cracked names both work)
//   region  one of REGIONS in data.js
//   role    one of ROLES in data.js (Owner, Admin, Senior Tester, Tester, Member)
//   tiers   gamemode slug (from GAMEMODES in data.js) -> tier (HT1..LT5)

export const PLAYERS = [
  {
    name: "burnet01",
    region: "NA",
    role: "Owner",
    tiers: {
      crystal: "HT1",
      axe: "LT1",
      sword: "HT2",
      mace: "LT2",
      nethertite: "HT3",
      pot: "LT3",
      smp: "HT4",
      uhc: "LT4",
      cart: "HT5",
      "mace-spear": "LT5",
    },
  },
  { name: "SampleTwo", region: "EU", role: "Senior Tester", tiers: { sword: "HT1", mace: "LT2" } },
  { name: "SampleThree", region: "NA", role: "Tester", tiers: { axe: "LT1", pot: "HT3", smp: "LT3" } },
  { name: "SampleFour", region: "AS", role: "Admin", tiers: { uhc: "HT2", cart: "LT2" } },
  { name: "SampleFive", region: "EU", role: "Member", tiers: { crystal: "LT2", "mace-spear": "HT1", nethertite: "HT4" } },
  { name: "SampleSix", region: "SA", role: "Tester", tiers: { mace: "HT3", axe: "LT4" } },
  { name: "SampleSeven", region: "NA", role: "Member", tiers: { pot: "LT3", smp: "HT4", sword: "LT5" } },
  { name: "SampleEight", region: "AU", role: "Senior Tester", tiers: { smp: "HT2", uhc: "HT4", crystal: "LT4", cart: "HT5" } },
];
