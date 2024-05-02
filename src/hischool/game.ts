// To recognize dom types (see https://bun.sh/docs/typescript#dom-types):
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />


const debug = window.location.search.indexOf("debug") >= 0;

import Phaser from "phaser";
import { alea } from "seedrandom";
//import { zzfx } from "zzfx";
import { evaluate } from "mathjs";
import wrap from "word-wrap";
import { DICO, HumanEvent } from "./human-events";
import { OPEN_AI_URL } from "..";
import { Newgrounds } from "medal-popup";

enum Bonus {
  JUMP,
  LEVITATE,
  STRENGTH,
  FREEZE,
  SHRINK,
  RANDOM,
  SWAP,
  CLIMB,
  EJECT_POWER,
  UPSIDE_DOWN,
}

enum BodyEnum {
  BODY = 0,
  UNDERWEAR = 1,
  SHIRT = 2,
  PANTS = 3,
  SKIRT = 4,
  SMALLSHOES = 5,
  SHOES = 6,
};

enum FaceEnum {
  SHAPE = 0,
  MOUTH = 1,
  NOSE = 2,
  EYES = 3,
  EYELASHES = 4,
  HAIR = 5,
  HAT = 6,
};

const ANIMATIONS_CONFIG: Record<BodyEnum | string, {
  walk: [number, number];
  still: [number, number];
}> = {
  [BodyEnum.BODY]: {
    walk: [10, 13],
    still: [10, 10],
  },
  [BodyEnum.UNDERWEAR]: {
    walk: [71, 74],
    still: [71, 71],
  },
  [BodyEnum.SHIRT]: {
    walk: [31, 34],
    still: [31, 31],
  },
  [BodyEnum.PANTS]: {
    walk: [15, 18],
    still: [15, 15],
  },
  [BodyEnum.SKIRT]: {
    walk: [19, 22],
    still: [19, 19],
  },
  [BodyEnum.SMALLSHOES]: {
    walk: [23, 26],
    still: [23, 23],
  },
  [BodyEnum.SHOES]: {
    walk: [27, 30],
    still: [27, 27],
  },
};

enum UselessPowers {
  MATH_WIZ,
  MASTER_CHEF,
  NOSHIT,
  BLUE,
  BURBERRY_MAN,
  WEATHER_MAN,
  INSECT_MAN,
  INVISIBLE_MAN,
}

const RANDOM_POWER = [
  "Math Wiz: The power to recite all digits of PI indefinitely.",
  "MasterChef: The power to cook delicious meals with snails.",
  "NoShit: The power to go several months without the need to go to the toilet.",
  "I'm blue: The power to turn completely blue.",
  "Burberry Man: The power to make their clothes disappear.",
  "Weather Man: The power to predict the weather exactly one year from now.",
  "Insect Man: The power to read the mind of an insect.",
  "Invisible Man: The power to turn invisible",
];


export const newgrounds = new Newgrounds({
  game: "The Supernatural Power Troll",
  url: "https://www.newgrounds.com/projects/games/5648862/preview",
  key: "58158:bSvU8TQ3",
  skey: "eguVfU6jxSWQKxgYbSV8FA==",
});

const BONUS_SIZE = 48;



export async function createHighSchoolGame(jsonUrl: string | undefined, saveUrl: string | undefined, forceLock?: boolean, skippedThrough?: boolean) {
  let nextLevelOverride: string | undefined;
  function getUnlockedStorage() {
    return JSON.parse(localStorage.getItem("troll-levels-unlocked") ?? "{}");
  }

  function unlockedLevel(level: string) {
    if (!level?.length) {
      return false;
    }
    const levelsUnlocked = getUnlockedStorage();
    console.log(levelsUnlocked, `level-${level}`, levelsUnlocked[`level-${level}`]);
    return levelsUnlocked[`level-${level}`];
  }

  function unlockLevel(level: string) {
    const levelsUnlocked = getUnlockedStorage();
    levelsUnlocked[`level-${level}`] = Date.now();
    localStorage.setItem("troll-levels-unlocked", JSON.stringify(levelsUnlocked));
  }

  if (!jsonUrl) {
    const regex = /#map=([\w\/.]+)/;
    const [, mapFromHash] = location.hash.match(regex) ?? [];
    console.log(location.hash, mapFromHash);
    if (mapFromHash) {
      jsonUrl = mapFromHash;
    } else {
      jsonUrl = "json/intro.json";
    }
  }
  const regex2 = /json\/map([\d.]+).json/;
  const [, level] = jsonUrl.match(regex2) ?? [];

  let someoneSpeaking = 0
  location.replace("#map=" + jsonUrl);
  const configResponse = await fetch("config.json");
  const conf = await configResponse.json();

  let randomPower = RANDOM_POWER[Math.floor(RANDOM_POWER.length * Math.random())];

  const POWER_DESC: Record<Bonus, string> = {
    [Bonus.JUMP]: "Super Jump: The power to jump very high, over ledges or small animals.",
    [Bonus.LEVITATE]: "Levitate: The power to levitate.",
    [Bonus.STRENGTH]: "Super Strength: The power to move heavy objects.",
    [Bonus.FREEZE]: "Freeze: The power to freeze other humans.",
    [Bonus.SHRINK]: "Ant man: The power to shrink.",
    [Bonus.RANDOM]: randomPower,
    [Bonus.SWAP]: "Switcharoo: The power to swap position with the closest human or troll.",
    [Bonus.EJECT_POWER]: "Eject Power: Existing power will be ejected out, back into a power-up.",
    [Bonus.UPSIDE_DOWN]: "Upside down: The power to walk upside down.",

    //  needs implementation
    [Bonus.CLIMB]: "Wall climber: The ability to climb walls with ease.",
  };

  const res = await fetch(jsonUrl);
  const mapJson: {
    locked: boolean;
    nextLevel?: string;
    ground: Record<string, (string | number)[]>;
    trigger: Record<string, (string | number)[]>;
    bonus: Record<string, (string | number)[]>;
    key: Record<string, (string | number)[]>;
    troll: Record<string, any>;
    door?: Record<string, any>;
    rock?: Record<string, any>;
    human?: Record<string, any>;
    water?: Record<string, any>;
    button?: Record<string, any>;
    gate?: Record<string, any>;
    overlay?: string;
    goldCity?: boolean;
    pizza?: boolean;
    hell?: boolean;
    hasCat?: boolean;
    hasSnail?: boolean;
    hasYellowCreature?: boolean;
    hasSlime?: boolean;
    autoNext?: boolean;
    redVelvet?: boolean;
  } = await res.json();


  if (!skippedThrough && mapJson) {
    unlockLevel(level);
  }

  const canEditLevel = conf.canEdit && !(forceLock ?? mapJson.locked);

  const { zzfx } = require("zzfx");
  const idSet = new Set();

  function getVoices() {
    return speechSynthesis.getVoices().filter(v => v.name.indexOf("Google") !== 0);
  }

  class Elem {
    dx: number = 0;
    airborne: number = 0;
    lastFrameOnGround = false;

    constructor(protected sprite: string, public player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
      this.player.setBounce(0.2);
      this.player.setCollideWorldBounds(true);
      this.player.body.useDamping = true;
      this.player.setBodySize(20, this.player.body.height).refreshBody();
    }
  }

  class Troll extends Elem {
    trollSprites: Phaser.GameObjects.Sprite[] = [];
    holdingBonus: Phaser.GameObjects.GameObject | undefined;
    holdingTemp: Phaser.GameObjects.GameObject | undefined;
    lastHold: number = 0;
    lastThrow: number = 0;
    destroyed?: boolean;
    vanishing: number = 0;
    onPlatform?: Phaser.Types.Physics.Arcade.GameObjectWithBody;

    constructor(scene: Phaser.Scene, x: number, y: number) {
      super('troll', scene.physics.add.sprite(x, y, 'troll', 1));
      this.player.body.allowDrag = true;

      this.trollSprites.push(
        scene.add.sprite(0, 0, "troll", 0),
      );
    }

    destroy() {
      this.destroyed = true;
      this.player.disableBody(true, true);
      this.player.setActive(false);
      this.trollSprites.forEach(sprite => {
        sprite.body?.gameObject.disableBody(true, true);
        sprite.setVisible(false);
        sprite.setActive(false);
      });
    }

    setTint(color: number) {
      this.trollSprites.forEach(sprite => sprite.setTint(color));
    }

    setFlipX(flipX: boolean) {
      this.player.setFlipX(flipX);
      this.trollSprites.forEach(sprite => sprite.setFlipX(flipX));
      this.holdingBonus?.body?.gameObject.setFlipX(flipX);
    }

    update(dt: number = 1, zzfx: any) {
      if (this.destroyed) {
        return;
      }
      this.player.setDrag(this.player.body.touching.down ? .0000001 : 1);

      this.trollSprites.forEach(sprite => sprite.setPosition(this.player.x, this.player.y));

      if (this.dx) {
        const speed = this.airborne ? 200 : 150;
        this.player.setVelocityX(speed * this.dx * dt);
        const flipX = this.dx < 0;
        this.setFlipX(flipX);
      } else {
        this.player.setVelocityX(this.player.body.velocity.x * .5);
      }
      if (this.onPlatform) {
        if (!this.player.body.touching.down) {
          this.onPlatform = undefined;
        } else {
          this.player.x += this.onPlatform.body.deltaX() * 2;
          this.player.y += this.onPlatform.body.deltaY() * 2;
        }
      }

      if (this.lastThrow && Date.now() - this.lastThrow < 400) {
        this.trollSprites.forEach((sprite, index) => sprite.anims.play('troll_throw', true));
      } else if (!this.dx) {
        this.trollSprites.forEach((sprite, index) => sprite.anims.play(this.holdingBonus ? 'troll_hold_still' : `troll_still`, true));
      } else {
        this.trollSprites.forEach((sprite, index) => sprite.anims.play(this.holdingBonus ? 'troll_hold_walk' : `troll_walk`, true));
      }
      const heldBonus = this.holdingTemp ?? this.holdingBonus;
      if (heldBonus) {
        const frame = this.trollSprites[0]?.anims.currentFrame?.index;
        const holdShift = (frame ?? 0) % 3;
        heldBonus.body?.gameObject.setPosition(this.player.x - (this.holdingTemp ? 30 : 0) * this.dx, this.player.y - 40 + holdShift);
      }

      if (this.airborne && Date.now() - this.airborne > 200 && this.player.body.touching.down) {
        this.airborne = 0;
      }

      const touchingDown = this.player.body.touching.down;
      this.lastFrameOnGround = touchingDown;
    }

    tryJump(zzfx: any, forceAllowJump: boolean = false) {
      if (this.player.body.touching.down || this.player.body.onFloor() || forceAllowJump) {
        this.player.setVelocityY(game.loop.actualFps < 35 ? -1300 : -1000);
        zzfx(...[, , 198, .04, .07, .06, , 1.83, 16, , , , , , , , , .85, .04]); // Jump
        this.airborne = Date.now();
      }
    }

    setScale(scaleX: number, scaleY: number) {
      [this.player, ...this.trollSprites].forEach(sprite => sprite.setScale(scaleX, scaleY));
    }

    foreObject(group: Phaser.Physics.Arcade.Group) {
      for (let item of group.getChildren()) {
        const gameObject = item.body?.gameObject;
        if (!item.active) {
          continue;
        }
        const px = gameObject.x - this.player.x;
        const py = gameObject.y - this.player.y;
        const dx = this.player.flipX ? -1 : 1;
        if (Math.abs(px) <= 60 && px * dx > 0 && Math.abs(py) < 20) {
          return item;
        }
      }
      return null;
    }

    hold(group: Phaser.Physics.Arcade.Group, zzfx: any, ui?: UI, isKey?: boolean) {
      if (Date.now() - this.lastHold < 200) {
        return;
      }
      if (!this.holdingBonus) {
        const item = this.foreObject(group);
        if (item) {
          this.holdingBonus = item;
          (item as any).disableBody(true, false);
          zzfx(...[, , 763, .01, .09, .11, , 1.14, 5.9, , 176, .03, , , , , , .7, .04]); // Pickup 250

          this.lastHold = Date.now();

          const bonus: any = this.holdingBonus;
          if (bonus) {
            if (isKey) {
              ui?.showPower("Press P again to toss", bonus);
            } else {
              ui?.showPower(
                POWER_DESC[parseInt(bonus.frame.name) as Bonus],
                bonus);
            }
          }
        }
      } else {
        const dx = this.player.flipX ? -1 : 1;
        const holdingBonus = this.holdingBonus;
        zzfx(...[2.04, , 26, .01, , .02, 4, .07, 2.9, , -24, .08, .05, , , , .09, .17, .02]); // Blip 316
        this.lastThrow = Date.now();
        setTimeout(() => {
          const gameObject = holdingBonus.body?.gameObject;
          (gameObject as any).enableBody(true, this.player.x, this.player.y - 25, true, true);
          (holdingBonus.body as any).setVelocityX(dx * 1500);
          (holdingBonus.body as any).setBounce(.1);
          (gameObject as any).refreshBody();
          this.holdingTemp = undefined;
          zzfx(...[1.62, , 421, .04, .06, .06, , 1.62, -28, 4.3, , , , .8, , , .03, .41, .08]); // Jump 298
        }, 100);

        this.holdingTemp = this.holdingBonus;
        this.holdingBonus = undefined;
        this.lastHold = Date.now();
        ui?.showPower();
      }
    }

    vanish() {
      createVanishEffect(this.player.scene, this.player.x, this.player.y);
      zzfx(...[, , 119, .02, .08, .06, , 1.4, -22, -3.2, , , , 1.4, , , , .87, .01]); // Jump 455
      this.trollSprites.forEach(sprite => sprite.setVisible(false));
      this.holdingBonus?.body?.gameObject?.setVisible(false);
      this.vanishing = Date.now();
    }

    reappear() {
      createVanishEffect(this.player.scene, this.player.x, this.player.y);
      zzfx(...[1.03, , 130, .01, .06, .09, , 1.24, -26, , , , , , , .1, , .65, .07]); // Jump 457
      this.trollSprites.forEach(sprite => sprite.setVisible(true));
      this.holdingBonus?.body?.gameObject?.setVisible(true);
      this.vanishing = 0;
    }

    addHistory() {
    }
  }

  let lastDialog = Date.now();

  class Human extends Elem {
    faceSprites: Phaser.GameObjects.Sprite[] = [];
    bodySprites: Phaser.GameObjects.Sprite[] = [];
    preX: number = 0;
    lastStill: number = 0;
    powerAcquired: number = 0;
    holdingBonus: Phaser.GameObjects.GameObject | undefined;
    seed: string = "";
    born: number;
    flyingLevel?: number;
    antMan?: number;
    normalMan?: number;
    frozen?: number;
    history: HumanEvent[] = [];
    humanScaleX: number;
    humanScaleY: number;
    sawTroll: number = 0;
    sawKey: number = 0;
    firstTimePush: number = 0;
    speaking = 0;
    lang?: string;
    inWater = 0;
    imBlue = 0;
    upsideDown = 0;
    naked = 0;
    invisible = 0;
    vanishing = 0;
    groundY: number | undefined;
    surprised: number = 0;

    constructor(scene: Phaser.Scene, x: number, y: number,
      platforms: Phaser.Physics.Arcade.StaticGroup,
      humanGroup: Phaser.Physics.Arcade.Group) {
      super('hi', scene.physics.add.sprite(x, y, 'hi', 56));
      // scene.physics.add.collider(this.player, platforms);
      humanGroup.add(this.player);
      (this.player as any).human = this;
      this.player.setCollideWorldBounds(true);

      this.bodySprites.push(
        scene.add.sprite(x, y, "hi", 10),   //  body
        scene.add.sprite(x, y, "hi", 71),   //  underwear
        scene.add.sprite(x, y, "hi", 31),  //  shirt
        scene.add.sprite(x, y, "hi", 15),  //  pants
        scene.add.sprite(x, y, "hi", 19),  //  skirt
        scene.add.sprite(x, y, "hi", 23),  //  smallshoes
        scene.add.sprite(x, y, "hi", 27),  //  shoes
      );

      this.faceSprites.push(
        scene.add.sprite(x, y, "hi", 36),  //  face
        scene.add.sprite(x, y, "hi", 41),  //  mouth
        scene.add.sprite(x, y, "hi", 46),  //  nose
        scene.add.sprite(x, y, "hi", 51),  //  eyes
        scene.add.sprite(x, y, "hi", 57),  //  eyelashes
        scene.add.sprite(x, y, "hi", 61),  //  hair
        scene.add.sprite(x, y, "hi", 66),  //  hat
      );
      this.randomize(Math.random());
      this.born = Date.now();
      this.humanScaleX = Math.random() / 5 + 1;
      this.humanScaleY = Math.random() / 5 + 1;
      this.setScale(1, this.humanScaleX ?? 1, this.humanScaleY ?? 1);
      if (this.faceSprites[FaceEnum.HAT].frame.name != "56") {
        this.addHistory(HumanEvent.HAT);
      }
      if (mapJson.goldCity) {
        this.addHistory(HumanEvent.GOLD_CITY);
      }
      if (mapJson.pizza) {
        this.addHistory(HumanEvent.PIZZA);
      }
      if (mapJson.hell) {
        this.addHistory(HumanEvent.HELL);
      }
      if (mapJson.redVelvet) {
        this.addHistory(HumanEvent.RED_VELVET);
      }
      this.addHistory(HumanEvent.WALKING);
      if (mapJson.goldCity) {
        this.addHistory(HumanEvent.STRANGE_WRITING);
      }
    }

    addHistory(event: HumanEvent) {
      if (this.history[this.history.length - 1] !== event) {
        this.history.push(event);
      }
    }

    getHeldBonus(): number | undefined {
      const bonus = this.holdingBonus as any;
      if (bonus) {
        return parseInt(bonus?.frame.name);
      }
      return undefined;
    }

    randomize(seed: any = Math.random()) {
      this.seed = seed + "";
      randomSprite(this.seed, this.faceSprites, this.bodySprites, this.naked, this.invisible);
    }

    setTint(color: number) {
      this.bodySprites.forEach(sprite => sprite.setTint(color));
      this.faceSprites.forEach(sprite => sprite.setTint(color));
    }

    clearTint() {
      this.bodySprites.forEach(sprite => sprite.clearTint());
      this.faceSprites.forEach(sprite => sprite.clearTint());
    }

    setFlipX(flipX: boolean) {
      this.player.setFlipX(flipX);
      this.bodySprites.forEach(sprite => sprite.setFlipX(flipX));
      this.faceSprites.forEach(sprite => sprite.setFlipX(flipX));
      this.holdingBonus?.body?.gameObject.setFlipX(flipX);
    }

    vanish() {
      createVanishEffect(this.player.scene, this.player.x, this.player.y);
      zzfx(...[, , 119, .02, .08, .06, , 1.4, -22, -3.2, , , , 1.4, , , , .87, .01]); // Jump 455
      this.bodySprites.forEach(sprite => sprite.setVisible(false));
      this.faceSprites.forEach(sprite => sprite.setVisible(false));
      this.holdingBonus?.body?.gameObject?.setVisible(false);
      this.vanishing = Date.now();
    }

    reappear() {
      createVanishEffect(this.player.scene, this.player.x, this.player.y);
      zzfx(...[1.03, , 130, .01, .06, .09, , 1.24, -26, , , , , , , .1, , .65, .07]); // Jump 457
      this.bodySprites.forEach(sprite => sprite.setVisible(true));
      this.faceSprites.forEach(sprite => sprite.setVisible(true));
      this.holdingBonus?.body?.gameObject?.setVisible(true);
      this.randomize(this.seed);
      this.vanishing = 0;
      if (this.flyingLevel) {
        this.flyingLevel = this.player.y - 50;
      }
      this.surprised = Date.now();
    }

    closestHuman() {
      let min = Number.MAX_SAFE_INTEGER;
      let closest: Human | Troll | undefined;
      const elems = [...humans, troll];
      for (const h of elems) {
        if (h !== this) {
          const dx = h.player.x - this.player.x;
          const dy = h.player.y - this.player.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < min) {
            min = distSq;
            closest = h;
          }
        }
      }
      return closest;
    }

    acquiringPower() {
      return this.powerAcquired && Date.now() - this.powerAcquired < 1000;
    }

    update(dt: number = 1, zzfx: any) {
      //  AI
      if (Date.now() - this.born > 2000) {
        if (!this.dx || this.lastStill && Date.now() - this.lastStill > 3000 && !(Date.now() - this.firstTimePush < 5000)) {
          this.dx = !this.dx ? 1 : -this.dx;
          this.lastStill = Date.now();
        }
      }

      if (this.inWater) {
        this.dx = 0;
        if (Date.now() - this.inWater > 500) {
          this.inWater = 0;
        }
      }

      if (this.frozen) {
        if (Date.now() - this.frozen < 15000) {
          this.setTint(0x0077FF);
          this.bodySprites.forEach((sprite, index) => sprite.anims.pause());
          this.player.setVelocityX(0);
        } else {
          this.clearTint();
          this.randomize(this.seed);
          this.bodySprites.forEach((sprite, index) => sprite.anims.resume());
          this.frozen = 0;
        }
      }

      if (this.imBlue) {
        this.bodySprites[BodyEnum.BODY].setTint(0x0099FF);
        this.faceSprites[FaceEnum.SHAPE].setTint(0x0099FF);
      }

      if (this.antMan && Date.now() - this.antMan < 1000) {
        const progress = (Date.now() - this.antMan) / 1000;
        this.setScale(1 - .7 * progress, this.humanScaleX - .7 * progress, this.humanScaleY - .7 * progress);
        // this.player.body.setSize(20, 20);
        // this.bodySprites.forEach(sprite => sprite.setDisplaySize(20, 20));
        // this.faceSprites.forEach(sprite => sprite.setDisplaySize(20, 20));
      } else if (this.normalMan) {
        if (Date.now() - this.normalMan < 1000) {
          const progress = (Date.now() - this.normalMan) / 1000;
          this.setScale(1 - .7 * progress, this.humanScaleY - .7 * (1 - progress), this.humanScaleY - .7 * (1 - progress));
        } else {
          this.setScale(1, this.humanScaleX, this.humanScaleY);
          this.normalMan = 0;
        }
      }

      if (this.acquiringPower()) {
        this.setTint(Math.floor(0xffffff * Math.random()));
        this.bodySprites.forEach((sprite, index) => sprite.anims.pause());
      } else if (this.powerAcquired) {
        this.lastStill = Date.now();
        this.clearTint();
        this.randomize(this.seed);

        this.powerAcquired = 0;
        this.bodySprites.forEach((sprite, index) => sprite.anims.resume());
        if (parseInt((this.holdingBonus as any).frame.name) === Bonus.SWAP) {
          setTimeout(() => {
            this.vanish();
            const ch = this.closestHuman();
            if (ch) {
              setTimeout(() => {
                ch.vanish();
                const { x, y } = this.player;
                setTimeout(() => {
                  const offsetY = ch === troll ? 48 / 2 - 64 / 2 : 0
                  this.player.setPosition(ch.player.x, ch.player.y + offsetY);
                  this.reappear();
                }, 200);
                setTimeout(() => {
                  ch.player.setPosition(x, y);
                  ch.reappear();
                }, 500);
              }, 300);
            } else {
              setTimeout(() => {
                this.reappear();
              }, 500);
            }

            this.addHistory(HumanEvent.TELEPORT);
            ch?.addHistory(HumanEvent.TELEPORT);
          }, 500);
        }
      }

      this.player.setDrag(this.player.body.touching.down ? .0001 : 1);

      const headShift = this.bodySprites[BodyEnum.BODY]?.anims.currentFrame?.index === 1 || this.player.anims.currentFrame?.index === 3 ? -2 : 0;
      this.bodySprites.forEach(sprite => sprite.setPosition(this.player.x, this.player.y + (this.inWater ? -5 * Math.sin(Date.now() / 300) : 0)));
      this.faceSprites.forEach(sprite => sprite.setPosition(this.player.x, this.player.y + (this.inWater ? -5 * Math.sin(Date.now() / 300) : 0) + 2 * headShift * this.player.scale));

      if (this.holdingBonus) {
        this.holdingBonus.body?.gameObject.setPosition(this.player.x, this.player.y - 50 * this.player.scale);
      }

      if (this.powerAcquired) {
        this.player.setVelocityX(0);
      } else {
        if (this.dx) {
          const paused = this.frozen || (Date.now() - this.sawTroll < 2000 || this.inWater || Date.now() - this.speaking < 3000 && !this.flyingLevel || Date.now() - this.firstTimePush < 3000 && Date.now() - this.firstTimePush > 1000);
          const speed = this.airborne ? 200 : paused ? 0 : 80;
          this.player.setVelocityX(speed * this.dx * dt * this.player.scale);
          const flipX = this.dx < 0;
          this.setFlipX(flipX);
          if (paused) {
            this.lastStill = Date.now();
          }
        }

        if (this.flyingLevel) {
          if (this.player.y >= this.flyingLevel) {
            this.player.setVelocityY(-10);
          } else {
            this.player.setVelocityY(0);
          }
        }

        if (Math.abs(this.preX - this.player.x) < 1.5 * this.player.scale) {
          this.bodySprites.forEach((sprite, index) => sprite.anims.play(this.flyingLevel ? `fly_${index}` : `still_${index}`, true));
          if (!this.lastStill) {
            this.lastStill = Date.now();
          }
        } else {
          this.bodySprites.forEach((sprite, index) => sprite.anims.play(this.flyingLevel ? `fly_${index}` : `walk_${index}`, true));
          this.lastStill = 0;
        }
        this.preX = this.player.x;
      }
      if (this.airborne && Date.now() - this.airborne > 200 && this.player.body.touching.down) {
        this.airborne = 0;
      }

      if (!this.player.body.touching.down && this.lastFrameOnGround) {
        if (this.holdingBonus && parseInt((this.holdingBonus as any).frame.name) === 0) {
          this.tryJump(zzfx, true);
        }
      }

      this.lastFrameOnGround = this.player.body.touching.down;
      if (this.lastFrameOnGround) {
        this.groundY = this.player.y;
      }

      if (this.surprised) {
        this.faceSprites[FaceEnum.MOUTH].setFrame("43");
        if (Date.now() - this.surprised > 2000) {
          this.surprised = 0;
          this.randomize(this.seed);
        }
      }
    }

    foundOutJump = 0;
    tryJump(zzfx: any, forceAllowJump: boolean) {
      if (this.player.body.touching.down || forceAllowJump) {
        this.player.setVelocityY(-800 * this.player.scale);
        zzfx(...[.2, , 198, .04, .07, .06, , 1.83, 16, , , , , , , , , .85, .04]); // Jump 252
        this.airborne = Date.now();
        if (Date.now() - this.foundOutJump > 10000) {
          this.foundOutJump = Date.now();
          this.addHistory(HumanEvent.SUPER_JUMP);
        }
      }
    }

    speakSeed: number | undefined;
    spokenHistory = 0;
    speakAI() {
      if (this.spokenHistory < this.history.length && !someoneSpeaking) {
        if (this.speaking && Date.now() - this.speaking < 10000 || !document.hasFocus()) {
          return;
        }
        this.speaking = Date.now();
        lastDialog = Date.now();

        this.spokenHistory = this.history.length;

        if (this.speakSeed === undefined) {
          this.speakSeed = parseInt(localStorage.getItem("speakSeed") ?? "0");
          localStorage.setItem("speakSeed", (this.speakSeed + 1).toString());
          console.log("SPEAKSEED", this.speakSeed);
        }
        const rng = alea(this?.seed + "");
        const voices = getVoices();
        const voice = voices[Math.floor(rng() * voices.length)];
        fetchAI(this.history.join("."), DICO, this.speakSeed, voice.lang, true).then(result => {
          console.log("Speak", result);
          this.speak(result.response);
        });
        this.addHistory(HumanEvent.CHAT);
      } else {

      }
    }

    setScale(playerScale: number, scaleX: number, scaleY: number) {
      this.player.setScale(playerScale);
      [...this.bodySprites, ...this.faceSprites].forEach(sprite => sprite.setScale(scaleX, scaleY));
    }

    getPower(bonus: Phaser.GameObjects.GameObject, zzfx: any) {
      this.lastStill = Date.now();
      const lostPowerFrame = this.holdingBonus ? parseInt((this.holdingBonus as any).frame.name) : undefined;
      const newPowerFrame = parseInt((bonus as any).frame.name);
      this.powerAcquired = Date.now();
      zzfx(...[, , 540, .04, .26, .45, , 1.56, -0.7, -0.1, -141, .07, .01, , , .1, , .9, .29, .45]); // TrollPowerup
      if (this.holdingBonus && bonus.body) {
        if (parseInt((bonus as any).frame.name) === Bonus.EJECT_POWER) {
          (this.holdingBonus as any).enableBody(true, (this.holdingBonus as any).x, (this.holdingBonus as any).y, true, true);
          this.holdingBonus.body?.gameObject.setAlpha(1);
          (this.holdingBonus as any).setDisplaySize(BONUS_SIZE, BONUS_SIZE).refreshBody();
          const trollDirection = troll.player.x - (bonus as any).x;
          (this.holdingBonus as any).setVelocity(800 * Math.sign(trollDirection), -200);
        } else {
          this.holdingBonus.destroy(true);
        }
      }

      this.holdingBonus = bonus;
      (bonus as any).disableBody(true, false);
      bonus.body?.gameObject.setAlpha(.5);
      (bonus as any).setDisplaySize(32, 32).refreshBody();
      if (newPowerFrame === Bonus.LEVITATE) {
        //  flying
        this.player.body.setAllowGravity(false);
        this.flyingLevel = (this.flyingLevel ?? this.groundY ?? this.player.y) - 50;
        this.surprised = Date.now();
      } else {
        this.player.body.setAllowGravity(true);
        this.flyingLevel = undefined;
      }

      if (newPowerFrame === Bonus.SHRINK) {
        this.antMan = Date.now();
      } else if (this.antMan) {
        this.normalMan = Date.now();
        this.antMan = 0;
      }

      if (newPowerFrame === Bonus.UPSIDE_DOWN) {
        this.upsideDown = Date.now();
        this.player.setGravity(0, -2000);
        this.player.setAccelerationY(-2000);
        this.player.refreshBody();
        this.setScale(1, this.humanScaleX, -this.humanScaleY);
        this.addHistory(HumanEvent.UPSIDE_DOWN);
        this.surprised = Date.now();
      } else if (this.upsideDown) {
        this.upsideDown = 0;
        this.setScale(1, this.humanScaleX, this.humanScaleY);
        this.player.setGravity(0, 2000);
        this.player.setAccelerationY(0);
        this.player.refreshBody();
        this.addHistory(HumanEvent.NOT_UPSIDE_DOWN);
      }

      switch (newPowerFrame) {
        case Bonus.JUMP:
          this.addHistory(HumanEvent.ACQUIRE_SUPER_JUMP);
          break;
        case Bonus.LEVITATE:
          this.addHistory(HumanEvent.FLY);
          break;
        case Bonus.STRENGTH:
          this.addHistory(HumanEvent.ACQUIRE_SUPER_STRENGTH);
          break;
        case Bonus.FREEZE:
          this.addHistory(HumanEvent.ACQUIRE_FREEZE);
          break;
        case Bonus.SHRINK:
          this.addHistory(HumanEvent.SHRUNK);
          break;
      }
      if (newPowerFrame !== lostPowerFrame) {
        if (lostPowerFrame === Bonus.LEVITATE) {
          this.addHistory(HumanEvent.DROP_DOWN);
        } else if (lostPowerFrame === Bonus.SHRINK) {
          this.addHistory(HumanEvent.EXPAND);
        }
      }

      if (newPowerFrame === Bonus.RANDOM) {
        newgrounds.unlockMedal("Useless superpower");
        this.surprised = Date.now();
        console.log(randomPower);
        switch (randomPower) {
          case RANDOM_POWER[UselessPowers.MATH_WIZ]:
            this.addHistory(HumanEvent.MATH_WIZ);
            break;
          case RANDOM_POWER[UselessPowers.MASTER_CHEF]:
            this.addHistory(HumanEvent.MASTER_CHEF);
            break;
          case RANDOM_POWER[UselessPowers.NOSHIT]:
            this.addHistory(HumanEvent.NOSHIT);
            break;
          case RANDOM_POWER[UselessPowers.BLUE]:
            setTimeout(() => {
              this.addHistory(HumanEvent.BLUE);
              this.imBlue = Date.now();
              this.randomize(this.seed);
            }, 1000);
            break;
          case RANDOM_POWER[UselessPowers.BURBERRY_MAN]:
            setTimeout(() => {
              this.addHistory(HumanEvent.BURBERRY_MAN);
              this.naked = Date.now();
              this.randomize(this.seed);
            }, 1000);
            break;
          case RANDOM_POWER[UselessPowers.INVISIBLE_MAN]:
            setTimeout(() => {
              this.addHistory(HumanEvent.INVISIBLE_MAN);
              this.invisible = Date.now();
              this.randomize(this.seed);
            }, 1000);
            break;
          case RANDOM_POWER[UselessPowers.WEATHER_MAN]:
            this.addHistory(HumanEvent.WEATHER_MAN);
            break;
          case RANDOM_POWER[UselessPowers.INSECT_MAN]:
            this.addHistory(HumanEvent.INSECT_MAN);
            break;
        }
      }
    }

    speak(message: string) {
      ui.chat(message, this);
    }

    metAnotherHuman = 0;
    meetAnotherHuman() {
      if (Date.now() - this.metAnotherHuman > 10000) {
        this.metAnotherHuman = Date.now();
        this.addHistory(HumanEvent.MEET_ANOTHER_HUMAN);
      }
    }
  }

  function randomSprite(
    seed: any,
    faceSprites: Phaser.GameObjects.Sprite[],
    bodySprites: Phaser.GameObjects.Sprite[],
    naked: any = false,
    invisible: any = false) {

    const rng = alea(seed + "");

    //  PANTS
    bodySprites[BodyEnum.PANTS].setVisible(false);
    bodySprites[BodyEnum.SKIRT].setVisible(false);
    if (rng() < .2) { //  no pants
    } else if (rng() < .2) {  //  both
      bodySprites[BodyEnum.PANTS].setVisible(true);
      bodySprites[BodyEnum.SKIRT].setVisible(true);
    } else if (rng() < .5) {
      bodySprites[BodyEnum.PANTS].setVisible(true);
    } else {
      bodySprites[BodyEnum.SKIRT].setVisible(true);
    }
    bodySprites[BodyEnum.PANTS].setTint(Math.floor(rng() * 0xffffff));
    bodySprites[BodyEnum.SKIRT].setTint(Math.floor(rng() * 0xffffff));
    bodySprites[BodyEnum.SHOES].setTint(Math.floor(rng() * 0xffffff));
    bodySprites[BodyEnum.SMALLSHOES].setTint(Math.floor(rng() * 0xffffff));
    bodySprites[BodyEnum.UNDERWEAR].setTint(Math.floor(rng() * 0xffffff) | 0x999999);
    bodySprites[BodyEnum.SHIRT].setTint(Math.floor(rng() * 0xffffff));
    const skinColor = Math.floor(rng() * 0xFFFFFF) | 0xaa9999;
    faceSprites[FaceEnum.SHAPE].setTint(skinColor);
    bodySprites[BodyEnum.BODY].setTint(skinColor);

    //  SHIRT
    bodySprites[BodyEnum.SHIRT].setVisible(rng() < .7);

    // SHOES
    if (rng() < .1) {
      bodySprites[BodyEnum.SHOES].setVisible(false);
      bodySprites[BodyEnum.SMALLSHOES].setVisible(false);
    } else if (rng() < .5) {
      bodySprites[BodyEnum.SHOES].setVisible(true);
      bodySprites[BodyEnum.SMALLSHOES].setVisible(false);
    } else {
      bodySprites[BodyEnum.SHOES].setVisible(false);
      bodySprites[BodyEnum.SMALLSHOES].setVisible(true);
    }

    //  FACES
    faceSprites[FaceEnum.SHAPE].setFrame(36 + Math.floor(rng() * 5))
    faceSprites[FaceEnum.MOUTH].setFrame(rng() < .1 ? 56 : 41 + Math.floor(rng() * 5));
    faceSprites[FaceEnum.NOSE].setFrame(rng() < .1 ? 56 : 46 + Math.floor(rng() * 5));
    faceSprites[FaceEnum.EYES].setFrame(51 + Math.floor(rng() * 5));
    faceSprites[FaceEnum.EYELASHES].setFrame(56 + Math.floor(rng() * 5));
    faceSprites[FaceEnum.HAIR].setFrame(rng() < .1 ? 56 : 61 + Math.floor(rng() * 5));
    faceSprites[FaceEnum.HAT].setFrame(rng() < .5 ? 56 : 66 + Math.floor(rng() * 5));

    if (naked) {
      bodySprites[BodyEnum.PANTS].setVisible(false);
      bodySprites[BodyEnum.SKIRT].setVisible(false);
      bodySprites[BodyEnum.SHOES].setVisible(false);
      bodySprites[BodyEnum.SMALLSHOES].setVisible(false);
      bodySprites[BodyEnum.SHIRT].setVisible(false);
      faceSprites[FaceEnum.HAT].setVisible(false);
    }
    if (invisible) {
      faceSprites[FaceEnum.SHAPE].setVisible(false);
      faceSprites[FaceEnum.MOUTH].setVisible(false);
      faceSprites[FaceEnum.NOSE].setVisible(false);
      faceSprites[FaceEnum.EYES].setVisible(false);
      faceSprites[FaceEnum.EYELASHES].setVisible(false);
      faceSprites[FaceEnum.HAIR].setVisible(false);
      bodySprites[BodyEnum.BODY].setVisible(false);
    }
  }

  let ui: UI;
  //let scoreText: Phaser.GameObjects.Text;
  class UI extends Phaser.Scene {
    startTime: number;
    endTime?: number;
    timerText?: Phaser.GameObjects.Text;
    powerText?: Phaser.GameObjects.Text;
    //powerIndic?: Phaser.GameObjects.Text;
    powerIcon?: Phaser.GameObjects.Image;
    //powerUnderline?: Phaser.GameObjects.Text;
    warningText?: Phaser.GameObjects.Text;
    warningTime = 0;
    grabText?: Phaser.GameObjects.Text;
    music: any;
    chatText?: Phaser.GameObjects.Text;
    chatFollow?: Phaser.GameObjects.Sprite;

    constructor() {
      super({ key: 'UIScene' });
      ui = this;
      this.startTime = Date.now();
    }

    preload() {
      this.load.audio('main', ['assets/troll-song.mp3']);
      this.load.audio('main2', ['assets/a-nice-troll.mp3']);
      this.load.audio('power-troll', ['assets/power-troll.mp3']);
      this.load.audio('game-over', ['assets/game-over.mp3']);
      this.load.audio('repeat', ['assets/repeat.mp3']);
      this.load.audio('trumpet', ['assets/trumpet.mp3']);
      this.load.audio('darkness', ['assets/darkness.mp3']);
      if (mapJson.overlay) {
        this.load.image('overlay', mapJson.overlay);
      }
      if (!mapJson.nextLevel) {
        this.load.image('the-end', 'assets/the-end.png');
      }
      this.load.image('santa', 'assets/santa.png');
    }

    create() {
      if (mapJson.overlay) {
        const overlay = this.add.image(GAMEWIDTH / 2, GAMEHEIGHT / 2, 'overlay').setDisplaySize(GAMEWIDTH, GAMEHEIGHT);
        overlay.preFX?.addShadow(0, 0, .1, .3, 0, 12, .3);

      }
      //  scoreText = this.add.text(16, 16, 'score: 0', { fontSize: '32px', color: '#fff' });
      if (level) {
        this.timerText = this.add.text(920, 6, '', {
          fontSize: '14pt', color: '#ddd',
          shadow: {
            color: "black",
            fill: true,
            offsetX: 1,
            offsetY: 1,
          }
        });
      }

      if (level) {
        this.music = this.sound.add(parseInt(level) % 2 === 1 ? 'main' : 'main2');
        this.music.loop = true;
        this.music.play();
      }

      const restartButton = this.add.text(GAMEWIDTH - 85, GAMEHEIGHT - 30, 'RESTART', {
        color: '#9cf',
        backgroundColor: "#00c",
        padding: {
          x: 5,
          y: 3,
        },
        shadow: {
          color: "black",
          fill: true,
          offsetX: 1,
          offsetY: 1,
        }
      });
      const underline = this.add.text(0, GAMEHEIGHT - 30, '_', {
        color: '#9cf',
        padding: {
          x: 20,
          y: 3,
        },
        shadow: {
          color: "black",
          fill: true,
          offsetX: 1,
          offsetY: 1,
        }
      });
      restartButton.setInteractive({ useHandCursor: true });
      restartButton.on("pointerdown", () => {
        this.showRestart();
      });
      restartButton.on('pointerover', function () {
        restartButton.setColor("#fff");
        underline.setColor("#fff");
      });
      restartButton.on('pointerout', function () {
        restartButton.setColor("#9cf");
        underline.setColor("#9cf");
      });
      restartButton.setVisible(!!level);
      underline.setX(restartButton.getLeftCenter().x - 15);
      underline.setVisible(!!level);

      this.warningText = this.add.text(180, 20, `Warning: The game has issues when running at low frame rate (${game.loop.actualFps.toFixed(1)} fps).\nThis could happen if your computer is low on battery`, {
        color: '#f66',
        backgroundColor: "#FFFF00cc",
        shadow: {
          color: "white",
          fill: true,
          offsetX: 2,
          offsetY: 2,
        },
      });
      this.warningText.setVisible(false);

      if (level) {
        const levelText = this.add.text(GAMEWIDTH / 2 - 50, 20, `Level ${level}`, {
          fontSize: 28, color: "#fff",
          shadow: {
            color: "black",
            fill: true,
            offsetX: 2,
            offsetY: 2,
          },
        })
        setTimeout(() => {
          levelText.setVisible(false);
        }, 8000);
      }

      this.grabText = this.add.text(30, GAMEHEIGHT - 30, 'Press P to pick up', {
        color: "#fff",
        shadow: {
          color: "black",
          fill: true,
          offsetX: 1,
          offsetY: 1,
        }
      });
      this.grabText.setVisible(false);

      this.powerIcon = this.add.image(30, GAMEHEIGHT - 25, 'sky').setDisplaySize(24, 24);
      this.powerIcon.setVisible(false);
      this.powerText = this.add.text(50, GAMEHEIGHT - 30, "", {
        fontSize: '18px', color: '#fff',
        shadow: {
          color: "black",
          fill: true,
          offsetX: 1,
          offsetY: 1,
        },
      });
      this.powerText.setVisible(false);
      // this.powerIndic = this.add.text(500, GAMEHEIGHT - 35, "info", {
      //   fontSize: '12px', color: '#fff',
      //   backgroundColor: "#08f",
      //   padding: {
      //     x: 2,
      //     y: 2,
      //   },
      //   align: "center",
      //   shadow: {
      //     color: "black",
      //     fill: true,
      //     offsetX: 1,
      //     offsetY: 1,
      //   },
      // });
      // this.powerIndic.setVisible(false);
      // this.powerIndic.setInteractive({ useHandCursor: true }).on('click', () => {

      // });
      // this.powerUnderline = this.add.text(500, GAMEHEIGHT - 35, "_", {
      //   fontSize: '12px', color: '#fff',
      //   padding: {
      //     x: 2,
      //     y: 2,
      //   },
      //   align: "center",
      //   shadow: {
      //     color: "black",
      //     fill: true,
      //     offsetX: 1,
      //     offsetY: 1,
      //   },
      // });;
      // this.powerUnderline.setVisible(false);


      this.chatText = this.add.text(0, 0, `testing`, {
        color: "#fff", shadow: {
          color: "black",
          offsetX: 2, offsetY: 2,
          fill: true,
        }
      });
      this.chatText.setVisible(false);

    }

    tt?: Timer;
    chatTimeout?: Timer;
    chat(msg: string, human?: Human) {
      clearTimeout(this.chatTimeout);
      speechSynthesis.cancel();
      if (msg?.length) {
        const message = wrap(msg, {
          width: 30,
        });
        if (human) {
          clearTimeout(this.tt);
          this.chatText?.setFontSize(human.antMan ? 12 : 18);
          someoneSpeaking = Date.now();
          const rng = alea(human?.seed + "");
          this.chatText?.setText("");
          const utterance = new SpeechSynthesisUtterance(message);
          const voices = getVoices();
          utterance.voice = voices[Math.floor(rng() * voices.length)];
          console.log("VOICE", utterance.voice.name, utterance.voice.lang);
          if (!human.lang) {
            human.lang = utterance.voice.lang;
          }
          const preFrame = human?.faceSprites[FaceEnum.MOUTH].frame.name ?? "";
          this.tt = setTimeout(() => {
            this.chatText?.setText(message);
          }, 1000);
          utterance.addEventListener("boundary", (e) => {
            clearTimeout(this.tt);
            this.chatText?.setText(message.slice(0, e.charIndex + e.charLength));
            human?.faceSprites[FaceEnum.MOUTH].setFrame(
              preFrame != "43" ? "43" : Math.floor(41 + Math.random() * 5),
            );
            setTimeout(() => {
              human?.faceSprites[FaceEnum.MOUTH].setFrame(preFrame);
            }, 200);
            this.tt = setTimeout(() => {
              this.chatText?.setText(message);
            }, 2000);
          });
          utterance.addEventListener("end", () => {
            this.chatText?.setText(message);
            if (human) {
              human.speaking = 0;
            }
            someoneSpeaking = 0;
            this.chatTimeout = setTimeout(() => {
              this.chat("");
            }, 3000);
          });
          speechSynthesis.speak(utterance)

          this.chatText?.setPosition(human?.player.x ?? 0, human?.player.y);
          this.chatText?.setVisible(true);
          this.chatFollow = human?.player
        }

      } else {
        this.chatText?.setVisible(false);
        this.chatFollow = undefined;
      }
    }

    showCanGrab(show: boolean) {
      this.grabText?.setVisible(show);
    }

    timeStr = "";
    update(time: number, delta: number): void {
      const endTime = this.endTime ?? Date.now();
      const newTimeStr = ((endTime - this.startTime) / 1000).toFixed(1) + " s";
      if (newTimeStr !== this.timeStr) {
        this.timeStr = newTimeStr;
        this.timerText?.setText(newTimeStr);
      }

      if (game.loop.actualFps < 35) {
        if (!this.warningTime) {
          this.warningTime = Date.now();
        }
        if (Date.now() - this.warningTime < 20000) {
          if (!this.warningText?.visible) {
            this.warningText?.setVisible(true);
            humans.forEach(human => human.addHistory(HumanEvent.LOW_BATTERY));
          }
          const newFPSText = `Warning: The game has issues when running at low frame rate (${game.loop.actualFps.toFixed(1)} fps).\nThis could happen if your computer is low on battery.`;
          this.warningText?.setText(newFPSText);
        } else {
          this.warningText?.setVisible(false);
        }
      } else {
        if (this.warningText?.visible) {
          this.warningText?.setVisible(false);
          humans.forEach(human => human.addHistory(HumanEvent.NORMAL_BATTERY));
          this.warningTime = 0;
        }
      }
      if (this.chatFollow) {
        this.chatText?.setPosition(Math.min(GAMEWIDTH - this.chatText.width, Math.max(0, this.chatFollow.x - this.chatText.width / 2)), Math.max(30, this.chatFollow.y - 50 - this.chatText.height));
      }
      if ((cursors as any).r.isDown) {
        this.showRestart();
      }
    }

    restarting = false;
    showRestart() {
      if (gameOver || victory || this.restarting) {
        return;
      }
      this.restarting = true;
      const rect = this.add.rectangle(GAMEWIDTH / 2, GAMEHEIGHT / 2, GAMEWIDTH, GAMEHEIGHT);
      rect.setFillStyle(0x000000, .7);
      const restartText = this.add.text(180, 0, `Restart this level?`, {
        color: '#fff',
        fontSize: 40,
        shadow: {
          color: "black",
          fill: true,
          offsetX: 2,
          offsetY: 2,
        },
      });
      restartText.setPosition(GAMEWIDTH / 2 - restartText.width / 2, GAMEHEIGHT / 2 - restartText.height / 2);

      const confirmText = this.add.text(350, GAMEHEIGHT / 2 + 100, `Confirm`, {
        color: "#0f0",
        fontSize: 24,
        shadow: {
          color: "black",
          fill: true,
          offsetX: 2,
          offsetY: 2,
        },
      });
      confirmText.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        startOver();
        document.removeEventListener("keydown", onKey);
      }).on("pointerover", () => choose(0));

      const cancelText = this.add.text(0, 0, `Cancel`, {
        color: "#f00",
        fontSize: 24,
        shadow: {
          color: "black",
          fill: true,
          offsetX: 2,
          offsetY: 2,
        },
      });
      cancelText.setPosition(GAMEWIDTH - 350 - cancelText.width, GAMEHEIGHT / 2 + 100);
      cancelText.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        closeRestart();
      }).on("pointerover", () => choose(1));

      const OPTIONS = [confirmText, cancelText];
      let index = 0;

      const choiceRect = this.add.rectangle(confirmText.x + confirmText.width / 2, confirmText.y + confirmText.height / 2, confirmText.width * 2, confirmText.height * 2);
      choiceRect.setStrokeStyle(5, 0xFFFFFF);
      choiceRect.setFillStyle(0xffffff, .3);
      const choose = (idx: number) => {
        index = idx;
        const text = OPTIONS[index];
        choiceRect.setPosition(text.x + text.width / 2, text.y + text.height / 2);
      };
      choose(0);

      gameScene?.pause();

      const closeRestart = () => {
        gameScene?.resume();
        this.scene.resume();
        restartText.destroy(true);
        rect.destroy(true);
        confirmText.destroy(true);
        cancelText.destroy(true);
        choiceRect.destroy(true);
        document.removeEventListener("keydown", onKey);
        this.restarting = false;
      };

      const onKey = (e: KeyboardEvent) => {
        const actionKey = e.code === "Space" || e.code === "Enter";
        if (e.code === "Escape" || e.code === "KeyR" || actionKey && index === 1) {
          closeRestart();
        } else if (e.code === "KeyA" || e.code === "ArrowLeft") {
          choose(Math.max(0, index - 1));
        } else if (e.code === "KeyD" || e.code === "ArrowRight") {
          choose(Math.min(1, index + 1));
        } else if (actionKey && index === 0) {
          startOver();
          document.removeEventListener("keydown", onKey);
        }
      };
      document.addEventListener("keydown", onKey);
    }

    stopAll() {
      this.music?.stop();
      this.endTime = Date.now();
      speechSynthesis.cancel();
    }

    keyToRestart(goNextLevel: boolean = false) {
      const onRestart = (e: KeyboardEvent) => {
        if (e.code === "Space") {
          if (goNextLevel) {
            nextLevel();
          } else {
            startOver();
          }
          document.removeEventListener("keydown", onRestart);
        }
      };
      setTimeout(() => {
        document.addEventListener("keydown", onRestart);
      }, 500);
    }

    gameOver() {
      this.stopAll();

      const sound = this.sound.add('game-over', {
        volume: 2
      });

      setTimeout(() => {
        const theEnd = this.add.image(GAMEWIDTH / 2, GAMEHEIGHT * 3 / 4, 'santa').setDisplaySize(GAMEWIDTH / 2, GAMEHEIGHT / 2);
        theEnd.postFX.addShadow();

        this.add.text(300, 200, 'GAME OVER', { fontSize: '64px', color: '#f00' })
          .postFX.addGlow(0x660000);
        sound.play();
        setTimeout(() => {
          this.add.text(250, 300, 'press a key to continue', { fontSize: '32px', color: '#fff' });
          this.keyToRestart();
        }, 1000);

      }, 500);
    }

    theEnd() {
      const theEnd = this.add.image(GAMEWIDTH / 2, GAMEHEIGHT / 2, 'the-end').setDisplaySize(GAMEWIDTH, GAMEHEIGHT);
      theEnd.postFX.addShadow();
    }

    victory() {
      victory = true;
      this.stopAll();

      if (mapJson.autoNext) {
        nextLevel();
        return;
      }
      const sound = this.sound.add('power-troll', {
        volume: 2
      });

      const loopy = this.sound.add('repeat', {
        volume: .5,
      });
      loopy.loop = true;



      setTimeout(() => {
        if (!mapJson.nextLevel) {
          this.theEnd();
        }
        this.add.text(250, 200, 'POWER TROLL!', { fontSize: '64px', color: '#0f0' })
          .setShadow(5, 5, 'rgba(0,0,0,0.5)', 15)
          .postFX.addGlow();

        sound.play();
        setTimeout(() => {
          if (mapJson.nextLevel) {
            this.add.text(250, 300, 'press a key to continue', { fontSize: '32px', color: '#fff' });
            this.keyToRestart(true);
          }

          if (!mapJson.nextLevel) {
            setTimeout(() => {
              newgrounds.unlockMedal("Beat the game!");
            }, 3000);
          }
          newgrounds.unlockMedal("Level " + level);
          newgrounds.postScore((this.endTime ?? Date.now()) - this.startTime, "Level " + (parseInt(level) < 10 ? " " : "") + level);


          loopy.play();
        }, 1000);
      }, 2000);
    }

    showPower(power: string = "", gameObject?: any) {
      const key = gameObject?.texture.key;
      const frame = gameObject?.frame.name;
      if (key) {
        this.powerIcon?.setTexture(key, frame);
        this.powerIcon?.setVisible(true);
        this.powerIcon?.setDisplaySize(24, 24);
      } else {
        this.powerIcon?.setVisible(false);
      }
      if (power.length) {
        this.powerText?.setText(power);
        this.powerText?.setVisible(true);
        // this.powerIndic?.setVisible(true);
        // this.powerIndic?.setX((this.powerText?.getRightCenter()?.x ?? 0) + 5);
        // this.powerUnderline?.setX((this.powerText?.getRightCenter()?.x ?? 0) + 5);
        // this.powerUnderline?.setVisible(true);
      } else {
        this.powerText?.setVisible(false);
        // this.powerIndic?.setVisible(false);
      }
    }
  }

  async function commit(type: string, id: string, x: number, y: number, width: number, height: number, frame?: number,
    extra?: any,
  ) {
    console.log("COMMIT", type, id, x, y, width, height, frame, extra);
    if (saveUrl) {
      await fetch(saveUrl, {
        method: "POST",
        body: JSON.stringify({
          jsonUrl,
          type,
          id,
          item: {
            x, y,
            width, height,
            frame,
            ...extra,
          },
        }),
      });
    } else {
      console.log("No saveUrl provided");
    }
  }

  async function commitLock(locked: boolean) {
    await fetch("lock", {
      method: "POST",
      body: JSON.stringify({
        jsonUrl,
        locked,
      }),
    });
  }


  function movePlatform(key: string, id: string, platform: Phaser.Physics.Arcade.Image,
    { leftEdge, rightEdge, topEdge, bottomEdge }: { leftEdge: boolean, rightEdge: boolean, topEdge: boolean, bottomEdge: boolean },
    rect?: Phaser.GameObjects.Rectangle,
    doneMoving?: () => void,
  ) {
    const posX = platform.x;
    const posY = platform.y;
    const preX = platform.scene.input.mousePointer.x;
    const preY = platform.scene.input.mousePointer.y;
    const platformW = platform.displayWidth;
    const platformH = platform.displayHeight;
    const onMove = (e: MouseEvent) => {
      const mouseX = platform.scene.input.mousePointer.x;
      const mouseY = platform.scene.input.mousePointer.y;
      const dx = mouseX - preX, dy = mouseY - preY;
      if (e.buttons) {
        if (!leftEdge && !rightEdge && !topEdge && !bottomEdge) {
          platform.setPosition(posX + dx, posY + dy).refreshBody();
          if (rect?.active) {
            rect?.setPosition(platform.x, platform.y);
          }
        } else {
          // const mx = (leftEdge ? -1 : 0) + (rightEdge ? 1 : 0);
          // const my = (topEdge ? -1 : 0) + (bottomEdge ? 1 : 0);
          const left = leftEdge ? (posX - platformW / 2 + dx) : (posX - platformW / 2);
          const right = rightEdge ? (posX + platformW / 2 + dx) : (posX + platformW / 2);
          const top = topEdge ? (posY - platformH / 2 + dy) : (posY - platformH / 2);
          const bottom = bottomEdge ? (posY + platformH / 2 + dy) : (posY + platformH / 2);
          // const newWidth = platformW + mx * dx, newHeight = platformH + my * dy;
          platform.setDisplaySize(right - left, bottom - top)
            .setPosition((right + left) / 2, (top + bottom) / 2)
            .refreshBody();
          //        rect?.setDisplaySize(platform.displayWidth, platform.displayHeight);
          if (rect?.active) {
            rect?.setPosition(platform.x, platform.y);
            rect?.setSize(platform.displayWidth, platform.displayHeight);
          }
        }
      }
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", () => {
      document.removeEventListener("mousemove", onMove);
      const p = (platform as any);
      commit(key, id, platform.x, platform.y, platform.displayWidth, platform.displayHeight, parseInt(platform.frame.name),
        {
          label: p.label,
          lockedByLevel: p.lockedByLevel,
          nextLevel: p.nextLevel,
          trigger: p.trigger,
          horizontal: p.horizontal,
        });
      doneMoving?.();
    }, { once: true });
  }

  function createVanishEffect(scene: Phaser.Scene, x: number, y: number) {
    const item = scene.add.sprite(x, y, "vanish");
    item.play("vanish");
  }


  function createDynamic(
    indicators: Phaser.Physics.Arcade.StaticGroup,
    platforms: Phaser.Physics.Arcade.Group | undefined,
    id: string,
    key: string,
    x: number, y: number,
    frame?: number,
    width?: number, height?: number,
    subject?: Phaser.GameObjects.Image
  ) {
    idSet.add(id);
    const platform: Phaser.Physics.Arcade.Image | undefined = platforms?.create(x, y, key, frame);
    const indic = indicators.create(x, y, key, frame);
    if (platform) {
      (platform as any).indic = indic;
    }
    indic.setAlpha(.3);
    if (width && height) {
      platform?.setDisplaySize(width, height);
      indic.setDisplaySize(width, height);
    }

    if (canEditLevel) {
      let startedMoving = false;
      indic.on('pointermove', (pointer: any, localX: number, localY: number, event: any) => {
        const cursor = "move";
        indic.scene.input.setDefaultCursor(cursor);
      });

      indic.on('pointerdown', (pointer: any, localX: number, localY: number, event: Event) => {
        if (startedMoving) {
          return;
        }
        startedMoving = true;
        if (cursors?.shift.isDown && platform) {
          let id = key;
          for (let i = 1; i < 100000; i++) {
            if (!idSet.has(key + i)) {
              id = key + i;
              break;
            }
          }
          const p: Phaser.Physics.Arcade.Image | undefined = createDynamic(indicators, platforms, id, key, platform.x, platform.y, frame);
          if (p) {
            movePlatform(key, id, (p as any).indic, {
              leftEdge: false, rightEdge: false, topEdge: false, bottomEdge: false,
            }, rect, () => {
              p.setPosition((p as any).indic.x, (p as any).indic.y);
              startedMoving = false;
            });
          }
        } else {
          movePlatform(key, id, indic, {
            leftEdge: false, rightEdge: false, topEdge: false, bottomEdge: false,
          }, rect, () => {
            platform?.setPosition(indic.x, indic.y);
            subject?.setPosition(indic.x, indic.y);
            startedMoving = false;
          });
        }
      });

      let rect: Phaser.GameObjects.Rectangle | undefined;
      indic.setInteractive().on('pointerover', function (pointer: any, localX: any, localY: any, event: any) {
        const scene: Phaser.Scene = indic.scene;
        rect = scene.add.rectangle(indic.x, indic.y, indic.displayWidth, indic.displayHeight);
        rect.setStrokeStyle(4, 0xefc53f);

        indic.once('pointerout', function (pointer: any, localX: any, localY: any, event: any) {
          indic.scene.input.setDefaultCursor("auto");
          rect?.destroy(true);
          rect = undefined;
        });
      });
    } else {
      indic.setVisible(false);
    }

    return platform;
  }

  //  size 400,32
  function createPlatform(platforms: Phaser.Physics.Arcade.StaticGroup,
    id: string,
    key: string,
    x: number, y: number,
    width?: number, height?: number,
  ) {
    idSet.add(id);
    const platform: Phaser.Physics.Arcade.Image = platforms.create(x, y, key);
    if (width && height) {
      platform.setSize(width, height).refreshBody();
      platform.setDisplaySize(width, height).refreshBody();
    }
    function edges(localX: number, localY: number) {
      const leftEdge = localX < 5;
      const rightEdge = localX > (platform.width) - 5;
      const topEdge = localY < 5;
      const bottomEdge = localY > (platform.height) - 5;
      return { leftEdge, rightEdge, topEdge, bottomEdge };
    }

    if (canEditLevel) {
      let startedMoving = false;
      platform.on('pointermove', (pointer: any, localX: number, localY: number, event: any) => {
        const { leftEdge, rightEdge, topEdge, bottomEdge } = edges(localX, localY);

        const cursor = leftEdge && topEdge || rightEdge && bottomEdge
          ? "nwse-resize"
          : rightEdge && topEdge || leftEdge && bottomEdge
            ? "nesw-resize"
            : leftEdge || rightEdge
              ? "ew-resize"
              : topEdge || bottomEdge
                ? "ns-resize"
                : "move";

        platform.scene.input.setDefaultCursor(cursor);
      });

      platform.on('pointerdown', (pointer: any, localX: number, localY: number, event: Event) => {
        if (startedMoving) {
          return;
        }
        startedMoving = true;
        const { leftEdge, rightEdge, topEdge, bottomEdge } = edges(localX, localY);
        let p = platform;
        if (cursors?.shift.isDown) {
          let id = key;
          for (let i = 1; i < 100000; i++) {
            if (!idSet.has(key + i)) {
              id = key + i;
              break;
            }
          }
          const p: Phaser.Physics.Arcade.Image = createPlatform(platforms, id, key, platform.x, platform.y, platform.displayWidth, platform.displayHeight);
          movePlatform(key, id, p, {
            leftEdge: false, rightEdge: false, topEdge: false, bottomEdge: false,
          }, rect, () => startedMoving = false);
        } else {
          movePlatform(key, id, p, {
            leftEdge, rightEdge, topEdge, bottomEdge,
          }, rect, () => startedMoving = false);
        }
      });

      let rect: Phaser.GameObjects.Rectangle | undefined;
      platform.setInteractive().on('pointerover', function (pointer: any, localX: any, localY: any, event: any) {
        const scene: Phaser.Scene = platform.scene;
        rect = scene.add.rectangle(platform.x, platform.y, platform.displayWidth, platform.displayHeight);
        rect.setStrokeStyle(4, 0xefc53f);

        platform.once('pointerout', function (pointer: any, localX: any, localY: any, event: any) {
          platform.scene.input.setDefaultCursor("auto");
          rect?.destroy(true);
          rect = undefined;
        });
      });
    }

    return platform;
  }

  function num(val: string | number) {
    return typeof (val) === "string" ? evaluate(val) : val;
  }



  let animations: Record<keyof BodyEnum | string, {
    walk: Phaser.Animations.Animation | false,
    still: Phaser.Animations.Animation | false,
    fly: Phaser.Animations.Animation | false,
  }> = {};
  let gameOver = false;
  let victory = false;
  let cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  const humans: Human[] = [];
  (window as any).humans = humans;
  let troll: Troll;
  let mainCamera: Phaser.Cameras.Scene2D.Camera;
  let preTime: number = 0;
  let sky: Phaser.GameObjects.Image;
  let bonusGroup: Phaser.Physics.Arcade.Group;
  let keyGroup: Phaser.Physics.Arcade.Group;
  let doorGroup: Phaser.Physics.Arcade.StaticGroup;
  let rocks: Phaser.Physics.Arcade.Group;
  let waterGroup: Phaser.Physics.Arcade.StaticGroup;
  let buttonGroup: Phaser.Physics.Arcade.StaticGroup;
  let gateGroup: Phaser.Physics.Arcade.StaticGroup;
  const triggerItems: Record<string, () => void> = {};

  const GAMEWIDTH = 1000, GAMEHEIGHT = 600;

  let gameScene: Phaser.Scenes.ScenePlugin | undefined;
  let visTime = 0;
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAMEWIDTH,
    height: GAMEHEIGHT,
    //pixelArt: true,//here
    physics: {
      default: 'arcade',
      arcade: {
        x: 0, y: 0, width: GAMEWIDTH, height: GAMEHEIGHT,
        gravity: { x: 0, y: 2000 },
        debug,
        fps: 60,
      },
    },
    scene: [{
      preload() {
        {
          this.load.image('sky', 'assets/sky.png');
          this.load.image('ground', 'assets/platform.png');
          this.load.image('trigger', 'assets/redbox.png');
          this.load.image('star', 'assets/star.png');
          this.load.image('bomb', 'assets/bomb.png');
          this.load.spritesheet('bonus', 'assets/bonus.png', {
            frameWidth: 32, frameHeight: 32,
          });
          this.load.spritesheet('hi',
            'assets/hischooler.png',
            { frameWidth: 64, frameHeight: 64 }
          );
          this.load.spritesheet('troll',
            'assets/troll.png',
            { frameWidth: 32, frameHeight: 32 }
          );
          this.load.spritesheet("rock",
            'assets/rock.png',
            { frameWidth: 64, frameHeight: 64 },
          );
          this.load.spritesheet("water",
            'assets/items.png',
            { frameWidth: 64, frameHeight: 64 },
          );
          this.load.spritesheet("key",
            'assets/items.png',
            { frameWidth: 64, frameHeight: 64 },
          );
          this.load.spritesheet("door",
            'assets/items.png',
            { frameWidth: 64, frameHeight: 64 },
          );
          this.load.spritesheet("sfx",
            'assets/sfx.png',
            { frameWidth: 64, frameHeight: 64 },
          );
          this.load.spritesheet("items",
            'assets/items.png',
            { frameWidth: 64, frameHeight: 64 },
          );
          this.load.image('mountain', 'assets/mountainbg.png');
        }
      },
      create() {
        gameScene = this.scene;

        this.scene.launch('UIScene');

        this.scene.setVisible(false);
        visTime = Date.now() + 500;


        if (level) {
          sky = this.add.image(GAMEWIDTH / 2, GAMEHEIGHT / 2, 'sky').setDisplaySize(GAMEWIDTH, GAMEHEIGHT);
          sky.setTint(0xffffff, 0xccffff, 0xcc66ff * Math.random() | 0x666699, 0xff44cc * Math.random() | 0x884488);

          (window as any).sky = sky;
          const mount = this.add.image(GAMEWIDTH / 2, GAMEHEIGHT / 2, 'mountain').setDisplaySize(GAMEWIDTH, GAMEHEIGHT)
            .setAlpha(.4);
          mount.preFX?.addBlur();
        }

        const platforms = this.physics.add.staticGroup();
        const indicators = this.physics.add.staticGroup();

        Object.entries(mapJson.ground ?? {}).forEach(([id, params]) => {
          if (!Array.isArray(params)) {
            const { x, y, width, height, frame, lockedByLevel } = params;
            if (lockedByLevel && !unlockedLevel(lockedByLevel) && !canEditLevel) {
              return;
            }
            const p = createPlatform(platforms, id, 'ground', x, y, width, height);
            (p as any).lockedByLevel = lockedByLevel;
            p.setAlpha(.3);

            if (lockedByLevel && !unlockedLevel(lockedByLevel)) {
              p.setAlpha(.2);
              p.setActive(false);
            }
            return;
          }
          const [x, y, w, h, lockedByLevel] = params.map(p => num(p));
          if (lockedByLevel && !unlockedLevel(lockedByLevel)) {
            return;
          }
          const p = createPlatform(platforms, id, 'ground', x, y, w, h);
          (p as any).lockedByLevel = lockedByLevel;
          p.setAlpha(.3);

          if (lockedByLevel && !unlockedLevel(lockedByLevel)) {
            p.setAlpha(.2);
            p.setActive(false);
          }
        });

        // createPlatform(platforms, 'a1', 'ground', 800, 568, 1600, 64);
        // createPlatform(platforms, 'a2', 'ground', 600, 400);
        // createPlatform(platforms, 'a3', 'ground', 50, 250);
        // createPlatform(platforms, 'a4', 'ground', 750, 220);
        doorGroup = this.physics.add.staticGroup();
        Object.entries(mapJson.door ?? {}).forEach(([id, params]) => {
          const { x, y, lockedByLevel, label, nextLevel } = params;
          if (lockedByLevel && !unlockedLevel(lockedByLevel) && !canEditLevel) {
            return;
          }


          const d = createPlatform(doorGroup, id, 'door', x, y);
          d.setBodySize(40, 64);
          if (label) {
            const labelText = this.add.text(x, y, label, {
              fontSize: '16pt', color: '#fff',
              shadow: {
                color: "black",
                fill: true,
                offsetX: 1,
                offsetY: 1,
              }
            });
            labelText.setPosition(x - labelText.width / 2, y - labelText.height / 2 - 10);
          }
          (d as any).nextLevel = nextLevel;
          (d as any).label = label;
          (d as any).lockedByLevel = lockedByLevel;
          if (lockedByLevel && !unlockedLevel(lockedByLevel)) {
            d.setActive(false);
            d.setAlpha(.3);
          }
        });

        Object.entries(mapJson.troll ?? {}).forEach(([id, params]) => {
          const { x, y } = params;
          troll = new Troll(this, x, y);
          troll.setScale(1.5, 1.5);
          createDynamic(indicators, undefined, "troll", "troll", x, y, undefined, 48, 48, troll.player);
        });
        if (!troll) {
          troll = new Troll(this, 200, 300);
          troll.setScale(1.5, 1.5);
        }

        const humanGroup = this.physics.add.group();
        Object.entries(mapJson.human ?? {}).forEach(([id, params]) => {
          const { x, y } = params;
          const human = new Human(this, x, y, platforms, humanGroup);
          createDynamic(indicators, undefined, id, "human", x, y, undefined, undefined, undefined, human.player);
          humans.push(human);
        });

        // humans.push(
        //   new Human(this, 100, 450, platforms, humanGroup),
        //   new Human(this, 300, 250, platforms, humanGroup),
        // );
        this.physics.add.collider(humanGroup, platforms);
        this.physics.add.collider(humanGroup, humanGroup, (human1: any, human2: any) => {
          human1.human.meetAnotherHuman();
          human2.human.meetAnotherHuman();
          if (Math.random() < .5) {
            human1.human.speakAI();
          } else {
            human2.human.speakAI();
          }
          if (human1.human.frozen) {
          } else {
            if (human2.human.getHeldBonus() === Bonus.FREEZE) {
              human1.human.frozen = Date.now();
              zzfx(...[1.52, , 1177, .23, .09, .09, 1, 1.41, 12, , , , , .4, , , .06, .25, .11, .11]); // Random 348
            }
          }
          if (human2.human.frozen) {
          } else {
            if (human1.human.getHeldBonus() === Bonus.FREEZE) {
              human2.human.frozen = Date.now();
              zzfx(...[1.52, , 1177, .23, .09, .09, 1, 1.41, 12, , , , , .4, , , .06, .25, .11, .11]); // Random 348
            }
          }
        });

        this.physics.add.overlap(humanGroup, humanGroup, (human1: any, human2: any) => {
          human1.human.meetAnotherHuman();
          human2.human.meetAnotherHuman();
          if (human1.human.frozen) {
          } else {
            if (human2.human.getHeldBonus() === Bonus.FREEZE) {
              human1.human.frozen = Date.now();
              zzfx(...[1.52, , 1177, .23, .09, .09, 1, 1.41, 12, , , , , .4, , , .06, .25, .11, .11]); // Random 348
            }
          }
          if (human2.human.frozen) {
          } else {
            if (human1.human.getHeldBonus() === Bonus.FREEZE) {
              human2.human.frozen = Date.now();
              zzfx(...[1.52, , 1177, .23, .09, .09, 1, 1.41, 12, , , , , .4, , , .06, .25, .11, .11]); // Random 348
            }
          }
        });




        const trollAnimation = {
          still: this.anims.create({
            key: `troll_still`,
            frames: this.anims.generateFrameNumbers('troll', { start: 0, end: 0 }),
            frameRate: 20,
          }),
          walk: this.anims.create({
            key: `troll_walk`,
            frames: this.anims.generateFrameNumbers('troll', { start: 2, end: 7 }),
            frameRate: 20,
            repeat: -1,
          }),
          hold_still: this.anims.create({
            key: `troll_hold_still`,
            frames: this.anims.generateFrameNumbers('troll', { start: 12, end: 12 }),
            frameRate: 20,
            repeat: -1,
          }),
          hold_walk: this.anims.create({
            key: `troll_hold_walk`,
            frames: this.anims.generateFrameNumbers('troll', { start: 13, end: 18 }),
            frameRate: 20,
            repeat: -1,
          }),
          throw: this.anims.create({
            key: `troll_throw`,
            frames: this.anims.generateFrameNumbers('troll', { start: 8, end: 11 }),
            frameRate: 10,
            repeat: 0,

          }),
        };

        for (const key in ANIMATIONS_CONFIG) {
          const config = ANIMATIONS_CONFIG[key];
          animations[key] = {
            walk: this.anims.create({
              key: `walk_${key}`,
              frames: this.anims.generateFrameNumbers('hi', { start: config.walk[0], end: config.walk[1] }),
              frameRate: 10,
              repeat: -1,
            }),
            still: this.anims.create({
              key: `still_${key}`,
              frames: this.anims.generateFrameNumbers('hi', { start: config.still[0], end: config.still[1] }),
              frameRate: 20,
            }),
            fly: this.anims.create({
              key: `fly_${key}`,
              frames: this.anims.generateFrameNumbers('hi', { start: config.walk[0], end: config.walk[1] }),
              frameRate: 20,
              repeat: -1,
            }),
          };
        }

        this.physics.add.collider(troll.player, platforms, (player, platform) => {
          const p = (player as Phaser.Types.Physics.Arcade.GameObjectWithBody);
          if (p.body.touching.down) {
            if (!hero.onPlatform) {
              hero.onPlatform = platform as Phaser.Types.Physics.Arcade.GameObjectWithBody;
            }
          }
        });;

        cursors = this.input.keyboard?.addKeys({
          up2: Phaser.Input.Keyboard.KeyCodes.W,
          up: Phaser.Input.Keyboard.KeyCodes.UP,
          down2: Phaser.Input.Keyboard.KeyCodes.S,
          down: Phaser.Input.Keyboard.KeyCodes.DOWN,
          left2: Phaser.Input.Keyboard.KeyCodes.A,
          left: Phaser.Input.Keyboard.KeyCodes.LEFT,
          right2: Phaser.Input.Keyboard.KeyCodes.D,
          right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
          space: Phaser.Input.Keyboard.KeyCodes.SPACE,
          p: Phaser.Input.Keyboard.KeyCodes.P,
          shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
          r: Phaser.Input.Keyboard.KeyCodes.R,
        }) as Phaser.Types.Input.Keyboard.CursorKeys;

        const triggers = this.physics.add.staticGroup({
          // key: 'red',
          // setXY: { x: 50, y: 500 },
        });

        rocks = this.physics.add.group({
          // key: 'rock',
          //          setXY: { x: 700, y: 500 },
          allowGravity: true,
        });
        Object.entries(mapJson.rock ?? {}).forEach(([id, params]) => {
          const { x, y, frame } = params;
          createDynamic(indicators, rocks, id, 'rock', x, y, frame);
        });

        this.physics.add.collider(rocks, keyGroup);
        this.physics.add.collider(rocks, rocks);
        this.physics.add.collider(rocks, platforms);
        this.physics.add.collider(rocks, humanGroup, (rock, human) => {
          const humanObj = (human as any).human;
          const bonus = humanObj.holdingBonus;
          if (bonus?.frame && parseInt(bonus?.frame.name) === Bonus.STRENGTH) {
            if (humanObj.player.body.touching.left || humanObj.player.body.touching.right) {
              if (!humanObj.firstTimePush) {
                humanObj.firstTimePush = Date.now();
                setTimeout(() => {
                  humanObj.surprised = Date.now();
                  humanObj.player.setVelocityY(-300);
                }, 1000);
              }
              (rock as any)?.setPushable(true);
              humanObj.addHistory(HumanEvent.PUSHED_ROCK);
              clearTimeout((rock as any).timeout);
              (rock as any).timeout = setTimeout(() => {
                if ((rock as any).visible) {
                  (rock as any)?.setPushable(false);
                }
              }, 200);
            }
          }
        });
        this.physics.add.collider(troll.player, rocks, (player, rock) => {
          const p = (player as Phaser.Types.Physics.Arcade.GameObjectWithBody);
          if (p.body.touching.down) {
            if (!hero.onPlatform) {
              hero.onPlatform = rock as Phaser.Types.Physics.Arcade.GameObjectWithBody;
            }
          }
        });
        rocks.getChildren().forEach(object => {
          object.body?.gameObject?.setPushable(false);
          object.body?.gameObject?.setDamping(true);
          object.body?.gameObject?.setDrag(.01);
          object.body?.gameObject?.setCollideWorldBounds(true);
        });


        Object.entries(mapJson.trigger ?? {}).forEach(([id, params]) => {
          if (!Array.isArray(params)) {
            const { x, y, width, height, frame } = params;
            const p = createPlatform(triggers, id, 'trigger', x, y);
            p.setAlpha(.1);
            return;
          }
          const [x, y, w, h] = params.map(p => num(p));
          const p = createPlatform(triggers, id, 'trigger', x, y, w, h);
          p.setAlpha(.1);
        });

        // createPlatform(triggers, 't1', 'red', 600 - 200, 400 - 10);
        // createPlatform(triggers, 't2', 'red', 600 + 200, 400 - 10);


        this.physics.add.collider(humanGroup, triggers, (human, trigger) => {
          const h = (human as any).human;
          if (h.holdingBonus && parseInt(h.holdingBonus.frame.name) === Bonus.JUMP) {
            h.tryJump(zzfx);
          }
          if (!h.hitTrigger) {
            h.hitTrigger = true;
            if (mapJson.hasSnail) {
              h.addHistory(HumanEvent.SAW_SNAIL);
            } else if (mapJson.hasCat) {
              h.addHistory(HumanEvent.SAW_CAT);
            } else if (mapJson.hasSlime) {
              h.addHistory(HumanEvent.WEIRD_GREEN_SLIMY_CREATURE);
            } else if (mapJson.hasYellowCreature) {
              h.addHistory(HumanEvent.DRUNK_YELLOW_CREATURE);
            }
            h.surprised = Date.now();
            if (h.player.body.touching.down) {
              h.player.setVelocityY(-200);
            }
          }
        });

        bonusGroup = this.physics.add.group({
          allowGravity: true,
          bounceY: .5,//.2,
          allowDrag: true,
          useDamping: true,
        });

        Object.entries(mapJson.bonus ?? {}).forEach(([id, params]) => {
          if (!Array.isArray(params)) {
            const { x, y, frame } = params;
            createDynamic(indicators, bonusGroup, id, 'bonus', x, y, frame, BONUS_SIZE, BONUS_SIZE);
            return;
          }
          const [x, y, frame] = params.map(p => num(p));
          createDynamic(indicators, bonusGroup, id, 'bonus', x, y, frame, BONUS_SIZE, BONUS_SIZE);
        });

        bonusGroup.getChildren().forEach(object => {
          object.body?.gameObject?.setPushable(false);
          object.body?.gameObject?.setDamping(true);
          object.body?.gameObject?.setDrag(.01);
          object.body?.gameObject?.setCollideWorldBounds(true);
          object.body?.gameObject?.preFX.addGlow(0xccffff, 1);
        });
        //        this.physics.add.collider(bonusGroup, bonusGroup);
        this.physics.add.collider(humanGroup, bonusGroup, (human, bonus) => {
          // (bonus as any).disableBody(true, true);
          const h: Human = (human as any).human;
          if (!h.acquiringPower()) {
            h.getPower(bonus as any, zzfx);
          }
        });
        this.physics.add.collider(bonusGroup, rocks);


        this.physics.add.collider(bonusGroup, platforms, (bonus, platform) => {
        }, undefined, this);

        this.physics.add.collider(troll.player, bonusGroup);


        this.anims.create({
          key: `key_anim`,
          frames: this.anims.generateFrameNumbers('items', { start: 0, end: 3 }),
          frameRate: 20,
          repeat: -1,
        })

        this.anims.create({
          key: `door`,
          frames: this.anims.generateFrameNumbers('items', { start: 4, end: 4 }),
          frameRate: 10,
        });
        this.anims.create({
          key: `door_open`,
          frames: this.anims.generateFrameNumbers('items', { start: 4, end: 6 }),
          frameRate: 10,
        });
        this.anims.create({
          key: `door_close`,
          frames: this.anims.generateFrameNumbers('items', { frames: [6, 5, 4] }),
          frameRate: 10,
        });
        this.anims.create({
          key: `water`,
          frames: this.anims.generateFrameNumbers('items', { start: 7, end: 10 }),
          frameRate: 3,
          repeat: -1,
        });
        this.anims.create({
          key: 'vanish',
          frames: this.anims.generateFrameNumbers('sfx', { start: 0, end: 5 }),
          frameRate: 10,
        });
        this.anims.create({
          key: `button_down`,
          frames: this.anims.generateFrameNumbers('items', { start: 11, end: 13 }),
          frameRate: 10,
        });
        this.anims.create({
          key: `button_up`,
          frames: this.anims.generateFrameNumbers('items', { frames: [13, 12, 11] }),
          frameRate: 10,
        });
        this.anims.create({
          key: `gate_down`,
          frames: this.anims.generateFrameNumbers('items', { start: 14, end: 20 }),
          frameRate: 25,
        });
        this.anims.create({
          key: `gate_up`,
          frames: this.anims.generateFrameNumbers('items', { frames: [19, 18, 17, 16, 15, 14] }),
          frameRate: 25,
        });
        this.anims.create({
          key: `hgate_open`,
          frames: this.anims.generateFrameNumbers('items', { start: 21, end: 27 }),
          frameRate: 25,
        });
        this.anims.create({
          key: `hgate_close`,
          frames: this.anims.generateFrameNumbers('items', { frames: [26, 25, 24, 23, 22, 21] }),
          frameRate: 25,
        });

        keyGroup = this.physics.add.group({
          allowGravity: true,
        });
        this.physics.add.collider(keyGroup, platforms);
        this.physics.add.collider(troll.player, keyGroup);
        this.physics.add.collider(keyGroup, humanGroup, (key, human) => {
          const h: Human = (human as any).human;
          if (!h.sawKey) {
            h.addHistory(HumanEvent.FOUND_KEY);
          }
          h.sawKey = Date.now();
        });

        Object.entries(mapJson.key ?? {}).forEach(([id, params]) => {
          if (!Array.isArray(params)) {
            const { x, y, frame } = params;
            const b = createDynamic(indicators, keyGroup, id, 'key', x, y, frame, 48, 48);
            if (b) {
              (b as any).anims.play('key_anim');
              (b as any).isKey = true;
              b.setDamping(true);
              b.setDrag(.01);
              b.setCollideWorldBounds(true);
            }
            return;
          }
          const [x, y, frame] = params.map(p => num(p));
          const b = createDynamic(indicators, keyGroup, id, 'key', x, y, frame, 48, 48);
          if (b) {
            (b as any).anims.play('key_anim');
            (b as any).isKey = true;
            b.setDamping(true);
            b.setDrag(.01);
            b.setCollideWorldBounds(true);
          }
        });

        buttonGroup = this.physics.add.staticGroup();
        Object.entries(mapJson.button ?? {}).forEach(([id, params]) => {
          const { x, y, width, height, trigger } = params;
          const b = createPlatform(buttonGroup, id, 'button', x, y, width, height);
          if (b) {
            (b as any).anims.play('button_up');
            (b as any).setDisplaySize(width, height).refreshBody();
            (b as any).trigger = trigger;
          }
        });
        gateGroup = this.physics.add.staticGroup();
        Object.entries(mapJson.gate ?? {}).forEach(([id, params]) => {
          const { x, y, width, height, horizontal } = params;
          const b = createPlatform(gateGroup, id, 'gate', x, y, width, height);
          if (b) {
            (b as any).anims.play(horizontal ? 'hgate_close' : 'gate_up');
            (b as any).setDisplaySize(width, height);
            (b as any).refreshBody();
            triggerItems[id] = () => {
              (b as any).anims.play(horizontal ? 'hgate_open' : 'gate_down');
              zzfx(...[, , 766, .02, .2, .41, 3, 2.72, , .8, , , , .4, , .1, , .39, .11]); // Explosion 525
              setTimeout(() => {
                (b as any).disableBody(true, false);
              }, 300);
            };
            triggerItems[`-${id}`] = () => {
              (b as any).enableBody(true, undefined, undefined, true, true);
              (b as any).anims.play(horizontal ? 'hgate_close' : 'gate_up');
              zzfx(...[, , 766, .02, .2, .41, 3, 2.72, , .8, , , , .4, , .1, , .39, .11]); // Explosion 525
            };
          }
        });
        this.physics.add.collider(troll.player, gateGroup);
        this.physics.add.collider(humanGroup, gateGroup);
        this.physics.add.collider(rocks, gateGroup);
        this.physics.add.collider(keyGroup, gateGroup);
        this.physics.add.collider(bonusGroup, gateGroup);


        const onCollidePushButton = (troll: any, button: any) => {
          const trollBody = (troll as Phaser.Types.Physics.Arcade.GameObjectWithBody).body;
          const b = (button as Phaser.Types.Physics.Arcade.GameObjectWithBody);
          if (trollBody.touching.left || trollBody.touching.right) {
            trollBody.y -= 5;
          }
          if (b.body.touching.up && !(b as any).isDown) {
            (b as any).isDown = true;
            (b as any).play("button_down");
            b.body.y += 15;
            b.body.setSize(b.body.width, 5);
            zzfx(...[, , 473, .01, .02, .14, 2, 1.63, , , 220, .03, , , 6.3, , , .53, .03, .04]); // Pickup 517
            if ((b as any).trigger) {
              setTimeout(() => {
                triggerItems[(b as any).trigger]?.();
              }, 300);
            }
          }
        };
        this.physics.add.collider(troll.player, buttonGroup, onCollidePushButton);
        this.physics.add.collider(humanGroup, buttonGroup, onCollidePushButton);
        this.physics.add.collider(rocks, buttonGroup, onCollidePushButton);
        this.physics.add.collider(keyGroup, buttonGroup, onCollidePushButton);
        this.physics.add.collider(bonusGroup, buttonGroup, onCollidePushButton);


        waterGroup = this.physics.add.staticGroup();
        Object.entries(mapJson.water ?? {}).forEach(([id, params]) => {
          const { x, y, width, height } = params;
          const b = createPlatform(waterGroup, id, 'water', x, y, width, height);//, width ?? 64, height ?? 64);
          if (b) {
            (b as any).anims.play({ key: 'water', randomFrame: true });
            (b as any).setBodySize(64, 20);
          }
        });
        this.physics.add.overlap(waterGroup, troll.player, (water, player) => {
          if (!gameOver) {
            setTimeout(() => {
              this.physics.pause();
            }, 200);
            const p = player as any;

            hero.setTint(0xff0000);
            ui.gameOver();

            gameOver = true;
          }
        }, undefined, this);
        this.physics.add.overlap(waterGroup, humanGroup, (water, human) => {
          const humanObj = (human as any).human as Human;
          if (!humanObj.inWater) {
            humanObj.dx = 0;
            (human as any).setVelocityX(0);
            zzfx(...[, , 71, .01, .05, .17, 4, .31, 5, , , , , , , .1, , .62, .05]); // Hit 370
            humanObj.addHistory(HumanEvent.SWIM);
          }
          humanObj.inWater = Date.now();
        });

        this.physics.add.collider(keyGroup, doorGroup, (key, door) => {
          if (!((door as any).isOpen)) {
            (door as any).anims.play("door_open");
            (door as any).isOpen = true;
            (key as any).disableBody(true, true);
            zzfx(...[26, , 117, , , .06, 4, .08, -0.1, -6, , , , , , .6, , .04, , .33]); // Random 282
          }
        });

        this.physics.add.overlap(doorGroup, humanGroup, (door, human) => {
          const humanObj = (human as any).human as Human;
          if ((door as any).isOpen) {
            humanObj.addHistory(HumanEvent.FOUND_DOOR_OPENED);
          } else {
            humanObj.addHistory(HumanEvent.FOUND_DOOR_CLOSED);
          }
        });

        doorGroup.getChildren().forEach(object => {
          (object as any).anims.play("door");
        });

        this.physics.add.overlap(troll.player, doorGroup, (player, door) => {
          if ((door as any).isOpen) {
            troll.destroy();
            (door as any).anims.play("door_close");
            zzfx(...[1.03, , 415, .05, .3, .46, 1, 1.91, 2.7, , , , .16, , 11, .1, , .69, .24, .27]); // Powerup 271
            ui.victory();
            nextLevelOverride = (door as any).nextLevel;
          }
        });

        /*
                const stars = this.physics.add.group({
                  key: 'star',
                  repeat: 11,
                  setXY: { x: 12, y: 0, stepX: 70 }
                });
        
                stars.children.iterate(function (child: Phaser.GameObjects.GameObject): boolean | null {
                  (child as any).setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
                  return null;
                });
                this.physics.add.collider(stars, platforms);
        
                this.physics.add.overlap(troll.player, stars, (player, star) => {
                  (star as any).disableBody(true, true);
        
                  score += 10;
                  scoreText.setText('Score: ' + score);
        
                  if (stars.countActive(true) === 0) {
                    stars.children.iterate(function (child) {
        
                      (child as any).enableBody(true, (child as any).x, 0, true, true);
                      return null;
                    });
        
                    const x = ((player as any).x < 400) ? Phaser.Math.Between(400, 800) : Phaser.Math.Between(0, 400);
        
                    const bomb = bombs.create(x, 16, 'bomb');
                    bomb.setBounce(1);
                    bomb.setCollideWorldBounds(true);
                    bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
        
                    humans.forEach(human => human.randomize());
                  }
        
                }, undefined, this);
        */
        const bombs = this.physics.add.group();

        this.physics.add.collider(bombs, platforms);

        const hero = troll;
        this.physics.add.collider(hero.player, bombs, (player, bomb) => {
          this.physics.pause();
          const p = player as any;

          hero.setTint(0xff0000);
          ui.gameOver();

          gameOver = true;
        }, undefined, this);

        this.physics.add.collider(hero.player, humanGroup, (player, human) => {
          const humanObj = (human as any).human;
          if (humanObj.frozen || humanObj.vanishing || troll.vanishing) {
            return;
          }

          this.physics.pause();
          const p = player as any;

          hero.setTint(0xff0000);
          ui.gameOver();
          zzfx(...[1.32, , 692, .04, .21, .24, , .16, , , , , .05, , 9, .1, .03, .69, .2, .11]); // Powerup 256

          gameOver = true;

        }, undefined, this);

        mainCamera = this.cameras.main;
      },
      update() {
        const now = Date.now();
        const dt = 1.5;//Math.min(3, Math.max(1, (now - preTime) / 10));
        //console.log(dt);
        preTime = now;

        const hero = troll;
        if (visTime && now - visTime > 500) {
          troll.player.scene.scene.setVisible(true);
          visTime = 0;
        }

        if (gameOver) {
          const flipX = Math.random() < .5 ? true : false;
          hero.setFlipX(flipX);
          return;
        }
        const dx = (cursors?.left.isDown || (cursors as any)?.left2.isDown ? -1 : 0) + (cursors?.right.isDown || (cursors as any)?.right2.isDown ? 1 : 0);

        hero.dx = dx;

        if (cursors?.space.isDown || cursors?.up.isDown) {
          hero.tryJump(zzfx);
        }

        if ((cursors as any).p.isDown || (cursors as any).shift.isDown) {
          hero.hold(bonusGroup, zzfx, ui);
          hero.hold(keyGroup, zzfx, ui, true);
          ui.showCanGrab(false);
        } else if (!hero.holdingBonus) {
          const item = hero.foreObject(bonusGroup) ?? hero.foreObject(keyGroup);
          if (item) {
            ui.showCanGrab(true);
          } else {
            ui.showCanGrab(false);
          }
        }

        rocks.getChildren().forEach(rock => {
          const topMap: Map<Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile, [number, number]> = (rock as any).topMap;
          topMap?.forEach(([time, pos], player) => {
            if (Date.now() - time < 10) {
              (player as any).setXY((rock as any).x + pos, (player as any).y);
            }
          });
        });


        // mainCamera.scrollX = hero.player.x - 400;
        // mainCamera.scrollY = hero.player.y - 300;
        // if (sky) {
        //   sky.setPosition(mainCamera.scrollX + GAMEWIDTH / 2, mainCamera.scrollY + GAMEHEIGHT / 2);
        // }
        humans.forEach(human => {
          if (!human.sawTroll) {
            const dx = Math.abs(human.player.x - troll.player.x);
            const dy = Math.abs(human.player.y - troll.player.y);
            if (dy < 50 && dx < 150) {
              human.sawTroll = Date.now();
              human.dx = Math.sign(troll.player.x - human.player.x);
              const flipX = human.dx < 0;
              human.setFlipX(flipX);

              human.addHistory(HumanEvent.SAW_TROLL);
              human.surprised = Date.now();
              if (!human.inWater && human.player.body.touching.down) {
                human.player.setVelocityY(-300);
              }
              human.lastStill = Date.now();
            }
          }
        });
        humans.forEach(human => human.update(dt, zzfx));
        troll.update(dt, zzfx);


        if (Date.now() - lastDialog > 10000 && !victory && !gameOver) {
          const h = humans;
          h[Math.floor(Math.random() * h.length)]?.speakAI();
        }

      },
    }, UI],
  };

  let game = new Phaser.Game(config);

  const instruct = document.body.appendChild(document.createElement("div"));
  instruct.style.whiteSpace = "pre";
  instruct.textContent = "You are\nThe Supernatural Power Troll\nKeys: AWSD to move, SPACE to jump, P to pick up/throw\nDo NOT get in contact with a human."

  let levelUi: HTMLDivElement | undefined;
  if (conf.canEdit) {
    levelUi = document.body.appendChild(document.createElement("div"));
    const button = levelUi.appendChild(document.createElement("button"));
    button.textContent = `NEXT LEVEL ${mapJson.nextLevel ?? ""}`;
    button.addEventListener("click", () => {
      nextLevel(true);
    });
    button.disabled = !mapJson.nextLevel;

    const lockCheck = levelUi.appendChild(document.createElement("input"));
    lockCheck.id = "lockCheck;"
    lockCheck.type = "checkbox";
    lockCheck.checked = mapJson.locked;
    const label = levelUi.appendChild(document.createElement("label"));
    label.htmlFor = "lockCheck";
    label.textContent = "lock";
    lockCheck.addEventListener("change", async () => {
      await commitLock(lockCheck.checked);
      startOver(lockCheck.checked);
    })
  }

  function startOver(forceLock?: boolean) {
    game.destroy(true);
    if (instruct?.parentElement === document.body) {
      document.body.removeChild(instruct);
    }
    if (levelUi?.parentElement === document.body) {
      document.body.removeChild(levelUi);
    }
    setTimeout(() => {
      createHighSchoolGame(jsonUrl, saveUrl, forceLock);
    }, 100);
  }

  function nextLevel(skippedThrough?: boolean) {
    game.destroy(true);
    if (instruct?.parentElement === document.body) {
      document.body.removeChild(instruct);
    }
    if (levelUi?.parentElement === document.body) {
      document.body.removeChild(levelUi);
    }
    setTimeout(() => {
      createHighSchoolGame(nextLevelOverride ?? mapJson.nextLevel ?? jsonUrl, saveUrl, skippedThrough);
    }, 100);
  }

  async function fetchAI(situation: string, dictionary: Record<string, string>, seed?: number, lang?: string, forceJsonP?: boolean) {
    const time = Date.now();
    const dico = {
      ...dictionary
    };
    let customFields: undefined | Record<string, { type: string; value: number | boolean | string }> = {
      "nativeLang": { value: lang ?? "en-US", type: "lang" },
      "lang": { value: navigator.language, type: "lang" },
    };

    //  WIP
    Object.entries(customFields).forEach(([key, field]) => {
      dico[HumanEvent.LANG] = dico[HumanEvent.LANG].replaceAll(`\${${key}}`, field.value.toString());
    });
    customFields = undefined;



    if (conf.canCallAI && !forceJsonP) {
      const response = await fetch(`/ai?dictionary=${JSON.stringify(dico)}&situation=${HumanEvent.LANG}.${situation}&seed=${seed ?? ""}${customFields ? `&customFields=${JSON.stringify(customFields)}` : ""}`);
      const json = await response.json();
      if (Date.now() - time > 9000) {
        return {};
      }
      return json;
    } else {
      return new Promise((resolve, reject) => {
        if (Date.now() - time > 9000) {
          resolve({});
          (window as any).fetchAIResponse = () => { };
          return;
        }
        (window as any).fetchAIResponse = (response: any) => {
          resolve(response);
          (window as any).fetchAIResponse = () => { };
        }
        const url = `${OPEN_AI_URL}?dictionary=${JSON.stringify(dico)}&situation=${HumanEvent.LANG}.${situation}&seed=${seed ?? ""}${customFields ? `&customFields=${JSON.stringify(customFields)}` : ""}&jsonp=fetchAIResponse`;
        const sc = document.body.appendChild(document.createElement("script"));
        sc.src = url;
      });
    }
  }
  (window as any).fetchAI = fetchAI;
  (game as any).newgrounds = newgrounds;

  return game;
}


speechSynthesis.getVoices();


const GOODVOICES = [
  "Grandpa",
  "Grandma",
  "Catherine",
  "Daniel",
  "Shelley",
  "Aaron",
];

const BADVOICES = [
  "Albert",
  "Google",
];
