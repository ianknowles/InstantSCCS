import { CombatStrategy } from "grimoire-kolmafia";
import {
  cliExecute,
  create,
  Effect,
  equippedItem,
  familiarWeight,
  haveEffect,
  itemAmount,
  mySign,
  numericModifier,
  print,
  toInt,
  use,
  useFamiliar,
  visitUrl,
} from "kolmafia";
import {
  $effect,
  $familiar,
  $familiars,
  $item,
  $location,
  $skill,
  $slot,
  CommunityService,
  get,
  have,
} from "libram";
import { Quest } from "../engine/task";
import { handleCustomPull, logTestSetup, tryAcquiringEffect } from "../lib";
import Macro from "../combat";
import {
  avoidDaylightShavingsHelm,
  chooseFamiliar,
  chooseHeaviestFamiliar,
  sugarItemsAboutToBreak,
} from "../engine/outfit";

export const FamiliarWeightQuest: Quest = {
  name: "Familiar Weight",
  completed: () => CommunityService.FamiliarWeight.isDone(),
  tasks: [
    {
      name: "Tune Moon to Platypus",
      completed: () =>
        !have($item`hewn moon-rune spoon`) ||
        get("moonTuned") ||
        get("instant_saveMoonTune", false) ||
        mySign() === "Platypus",
      do: (): void => {
        cliExecute("spoon platypus");
      },
    },
    {
      name: "Fold Burning Newspaper",
      completed: () => !have($item`burning newspaper`),
      do: () => cliExecute("create burning paper crane"),
      limit: { tries: 1 },
    },
    {
      name: "Meteor Shower",
      completed: () =>
        have($effect`Meteor Showered`) ||
        !have($item`Fourth of May Cosplay Saber`) ||
        !have($skill`Meteor Lore`) ||
        get("_saberForceUses") >= 5,
      do: $location`The Dire Warren`,
      combat: new CombatStrategy().macro(
        Macro.trySkill($skill`Meteor Shower`)
          .trySkill($skill`Use the Force`)
          .abort()
      ),
      outfit: () => ({
        weapon: $item`Fourth of May Cosplay Saber`,
        familiar: chooseFamiliar(false),
        avoid: [
          ...sugarItemsAboutToBreak(),
          ...(avoidDaylightShavingsHelm() ? [$item`Daylight Shavings Helmet`] : []),
        ],
      }),
      choices: { 1387: 3 },
      limit: { tries: 1 },
    },
    {
      name: "Test",
      completed: () => CommunityService.FamiliarWeight.isDone(),
      prepare: (): void => {
        const usefulEffects: Effect[] = [
          $effect`Billiards Belligerence`,
          $effect`Blood Bond`,
          $effect`Boxing Day Glow`,
          $effect`Do I Know You From Somewhere?`,
          $effect`Empathy`,
          $effect`Fidoxene`,
          $effect`Heart of Green`,
          $effect`Kindly Resolve`,
          $effect`Leash of Linguini`,
          $effect`Puzzle Champ`,
          $effect`Robot Friends`,
          $effect`Shortly Stacked`,
        ];
        usefulEffects.forEach((ef) => tryAcquiringEffect(ef, true));

        if (have($item`love song of icy revenge`))
          use(
            Math.min(
              4 - Math.floor(haveEffect($effect`Cold Hearted`) / 5),
              itemAmount($item`love song of icy revenge`)
            ),
            $item`love song of icy revenge`
          );

        const heaviestWeight = familiarWeight(chooseHeaviestFamiliar()) + (have($item`astral pet sweater`) ? 10 : 0);
        const calcCommaWeight = (upgrades: number) => 6 + 11 * upgrades;
        const maxRobotUpgrades = 9;
        const commaWeight = calcCommaWeight(get("homemadeRobotUpgrades"));
        const useComma = ($familiars`Comma Chameleon, Homemade Robot`.every((fam) => have(fam)) &&
            commaWeight > heaviestWeight);
        if ($familiars`Comma Chameleon, Homemade Robot`.every((fam) => have(fam)) &&
            commaWeight < calcCommaWeight(maxRobotUpgrades)) {
          print(`Comma Chameleon is not at max weight, use ${maxRobotUpgrades - get("homemadeRobotUpgrades")} more parts on Homemade Robot.`, "red");
        }
        const useTrainbot = have($familiar`Mini-Trainbot`) &&
            ((familiarWeight($familiar`Mini-Trainbot`) + 25) > heaviestWeight);
        const useParrot = have($familiar`Exotic Parrot`) &&
            ((familiarWeight($familiar`Exotic Parrot`) + 15) > heaviestWeight);

        if (
          have($skill`Summon Clip Art`) &&
          !get("instant_saveClipArt", false) &&
          (useTrainbot||useParrot||useComma)
        ) {
          if (!have($item`box of Familiar Jacks`)) create($item`box of Familiar Jacks`, 1);
          if (useComma) {
            useFamiliar($familiar`Homemade Robot`);
            use($item`box of Familiar Jacks`, 1);
            useFamiliar($familiar`Comma Chameleon`);
            visitUrl(
              `inv_equip.php?which=2&action=equip&whichitem=${toInt(
                $item`homemade robot gear`
              )}&pwd`
            );
            visitUrl("charpane.php");
          } else {
            if (useTrainbot) useFamiliar($familiar`Mini-Trainbot`);
            else useFamiliar($familiar`Exotic Parrot`);
            use($item`box of Familiar Jacks`, 1);
          }

          get("instant_famTestPulls").split(",").forEach(handleCustomPull);

          cliExecute("maximize familiar weight");

          if (
            have($skill`Aug. 13th: Left/Off Hander's Day!`) &&
            !get("instant_saveAugustScepter", false) &&
            numericModifier(equippedItem($slot`off-hand`), "Familiar Weight") > 0 &&
            CommunityService.FamiliarWeight.actualCost() > 1
          ) {
            tryAcquiringEffect($effect`Offhand Remarkable`);
          }
        }
      },
      do: (): void => {
        const maxTurns = get("instant_famTestTurnLimit", 50);
        const testTurns = CommunityService.FamiliarWeight.actualCost();
        if (testTurns > maxTurns) {
          print(`Expected to take ${testTurns}, which is more than ${maxTurns}.`, "red");
          print("Either there was a bug, or you are under-prepared for this test", "red");
          print("Manually complete the test if you think this is fine.", "red");
          print(
            "You may also increase the turn limit by typing 'set instant_famTestTurnLimit=<new limit>'",
            "red"
          );
        }
        CommunityService.FamiliarWeight.run(
          () => logTestSetup(CommunityService.FamiliarWeight),
          maxTurns
        );
      },
      outfit: () => ({ modifier: "familiar weight", familiar: chooseHeaviestFamiliar() }),
      limit: { tries: 1 },
    },
  ],
};
