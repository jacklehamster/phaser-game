// To recognize dom types (see https://bun.sh/docs/typescript#dom-types):
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />


const debug = window.location.search.indexOf("debug") >= 0;
const webConfig = window.location.search.indexOf("web-config") >= 0;
const serverLessEdit = window.location.search.indexOf("serverless-edit") >= 0;

import Phaser from "phaser";
import { alea } from "seedrandom";
//import { zzfx } from "zzfx";
import { evaluate } from "mathjs";
import wrap from "word-wrap";
import { DICO, HumanEvent } from "./human-events";
import { OPEN_AI_URL } from "..";
import { Newgrounds } from "medal-popup";
import { unlockedLevel, unlockLevel } from "./level-storage";
import { MapJson } from "./mapjson";
import { prepareUrls, revoke, u } from "./prepare";


const configJsonLink = "config.json" + (webConfig ? "?web-config=true" : "");
console.log(configJsonLink);


const TROLL_DISPLAY_SCALE = 1.8;

enum UIButton {
  NewPlatform,
  NewKey,
  NewDoor,
  NewRock,
  NewWater,
  NewHuman,
  NewPowerup,
  Duplicate,
  Trash,
  Cancel,
};

enum Icons {
  KEY = 0,
  DOOR = 4,
  WATER = 17,
  BLUE_FRAME = 42,
  GREEN_FRAME = 43,
  ARROW = 44,
  TRASH = 47,
  TRASH_OPENED = 48,
  POINTER = 49,
  DUPLICATE = 50,
  PLATFORM = 51,
  HUMAN = 54,
  CANCEL = 55,
};

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
  GEMINI,
  BRAIN_SWAP,
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
  BIB,
  GOLD_CHAIN,
  SCARF,
  HEADPHONES_RIGHT,
  SHAPE,
  MOUTH,
  NOSE,
  EYES,
  EYELASHES,
  GLASSES,
  HAIR,
  HAT,
  HEADPHONES_LEFT,
  BUNNY_EAR,
  FLOWER,
};

const FACE_ACCESSORIES = [
  FaceEnum.BIB,
  FaceEnum.GOLD_CHAIN,
  FaceEnum.SCARF,
  FaceEnum.HEADPHONES_RIGHT,
  FaceEnum.HEADPHONES_LEFT,
  FaceEnum.BUNNY_EAR,
  FaceEnum.FLOWER,
];

const ACCESORY_TO_EVENT: Record<keyof FaceEnum | string, HumanEvent> = {
  [FaceEnum.BIB]: HumanEvent.BIB,
  [FaceEnum.GOLD_CHAIN]: HumanEvent.GOLD_CHAIN,
  [FaceEnum.SCARF]: HumanEvent.SCARF,
  [FaceEnum.HEADPHONES_LEFT]: HumanEvent.HEADPHONES,
  [FaceEnum.BUNNY_EAR]: HumanEvent.BUNNY_EAR,
  [FaceEnum.FLOWER]: HumanEvent.FLOWER,
}

const startedTimeout: Set<Timer> = new Set();
const onStartCallbacks: Set<(newMapJson?: MapJson) => void> = new Set();

const HUMAN_ANIM = {
  BODY_RAW: [10, 13],
  PANTS: [15, 18],
  SKIRT: [19, 22],
  SMALL_SHOE: [23, 26],
  BIG_SHOE: [27, 30],
  SHIRT: [31, 34],
  FACE_SHAPE: [36, 40],
  FACE_MOUTH: [41, 45],
  FACE_MOUTH_OPENED: [44],
  FACE_MOUTH_SMILE: [45],
  FACE_MOUTH_NEUTRAL: [42],
  FACE_NOSE: [46, 50],
  FACE_EYES: [51, 55],
  EMPTY: [56],
}

const OPEN_MOUTH = HUMAN_ANIM.FACE_MOUTH_OPENED[0];
const EMPTY_FACE_ENUM = HUMAN_ANIM.EMPTY[0];

const FREEZE_LIMIT = 15000;

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

const BONUS_SIZE = 40;
const BONUS_COUNT = 12;



// let previousMapJson: MapJson | undefined;
let conf: {
  "canEdit": boolean,
  "canCallAI": boolean,
};

export async function createHighSchoolGame(
  jsonUrl: string | undefined,
  saveUrl: string | undefined,
  forceLock?: boolean,
  skippedThrough?: boolean,
  blobs?: Record<string, string>) {


  startedTimeout.forEach(timer => clearTimeout(timer));
  startedTimeout.clear();

  speechSynthesis.cancel();
  let nextLevelOverride: string | undefined;

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
  if (!conf) {
    conf = await (await fetch(u(configJsonLink, blobs))).json();
  }

  let randomPower = RANDOM_POWER[Math.floor(RANDOM_POWER.length * Math.random())];

  const POWER_DESC: Record<Bonus, string> = {
    [Bonus.JUMP]: "Super Jump: The power to jump very high, over ledges or small animals.",
    [Bonus.LEVITATE]: "Levitate: The power to levitate.",
    [Bonus.STRENGTH]: "Super Strength: The power to move heavy objects.",
    [Bonus.FREEZE]: "Freeze: The power to freeze other humans.",
    [Bonus.SHRINK]: "Ant man: The power to shrink.",
    [Bonus.RANDOM]: randomPower,
    [Bonus.SWAP]: "Switcharoo: The power to swap position with the closest person.",
    [Bonus.EJECT_POWER]: "Eject Power: Existing power will be ejected back out into a power-up.",
    [Bonus.UPSIDE_DOWN]: "Upside down: The power to walk upside down.",
    [Bonus.GEMINI]: "Gemini: The power to duplicate the body into two.",
    [Bonus.BRAIN_SWAP]: "Brain Swap: The power to swap brain with the nearest troll.",

    //  needs implementation
    [Bonus.CLIMB]: "Wall climber: The ability to climb walls with ease.",
  };

  const mapJson: MapJson = /* previousMapJson?.url === jsonUrl ? previousMapJson :*/ await (await fetch(jsonUrl)).json();
  mapJson.url = jsonUrl;
  // previousMapJson = mapJson;
  onStartCallbacks.forEach(callback => callback(mapJson));
  onStartCallbacks.clear();

  await prepareUrls([
    'assets/troll-song.mp3',
    'assets/a-nice-troll.mp3',
    'assets/power-troll.mp3',
    'assets/game-over.mp3',
    'assets/repeat.mp3',
    'assets/trumpet.mp3',
    'assets/darkness.mp3',
    'assets/the-end.png',
    'assets/santa.png',

    'assets/sky.png',
    'assets/platform.png',
    'assets/trigger.png',
    'assets/star.png',
    'assets/bomb.png',
    'assets/bonus.png',
    'assets/hischooler.png',
    'assets/troll.png',
    'assets/rock.png',
    'assets/items.png',
    'assets/sfx.png',
    'assets/mountainbg.png',
    mapJson.overlay,
    configJsonLink,
  ], 0, undefined, blobs, true);
  if (mapJson.overlay) {
    const o = mapJson.overlay;
    onStartCallbacks.add((newMapJson) => {
      if (newMapJson?.overlay !== o) {
        revoke(o, blobs);
      }
    });
  }

  if (!skippedThrough && mapJson) {
    unlockLevel(level);
  }

  const canEditLevel = serverLessEdit || (conf.canEdit && !(forceLock ?? mapJson.locked));

  const { zzfx: zz } = require("zzfx");
  const zzfx = (...params: any[]) => {
    if (game.sound.mute) {
      return;
    }
    if (!mapJson.locked) {
      params[0] = (params[0] ?? 1) * .2;
    }
    zz(...params);
  };
  const idSet = new Set();

  function makeId(key: string) {
    let id = key;
    for (let i = 1; i < 100000; i++) {
      if (!idSet.has(key + i)) {
        id = key + i;
        break;
      }
    }
    return id;
  }

  function getVoices() {
    return speechSynthesis.getVoices().filter(v => v.name.indexOf("Google") !== 0);
  }

  let selectedElement: Phaser.GameObjects.GameObject | undefined;
  let onDeselect: (() => void) | undefined;
  let onDeleteSelected: (() => void) | undefined;

  function setUiIndex(index: number) {
    uiIndex = index;
    onDeselect?.();
    uiBacks.forEach((back, idx) => {
      back.setFrame(idx === cancelButtonIndex ? Icons.CANCEL : uiIndex === idx ? Icons.GREEN_FRAME : Icons.BLUE_FRAME);
    });
    gameScene?.scene.input.setDefaultCursor(getUiCursor() ?? "auto");
    switch (uiIndex) {
      case UIButton.NewPlatform:
        ghostPlatform = gameScene?.scene.add.image(0, 0, 'ground');
        ghostPlatform?.setDisplaySize(50, 50);
        break;
      case UIButton.NewHuman:
        ghostPlatform = gameScene?.scene.add.image(0, 0, 'items', Icons.HUMAN);
        break;
      case UIButton.NewDoor:
        ghostPlatform = gameScene?.scene.add.image(0, 0, 'items', Icons.DOOR);
        break;
      case UIButton.NewWater:
        ghostPlatform = gameScene?.scene.add.image(0, 0, 'items', Icons.WATER);
        break;
      case UIButton.NewKey:
        ghostPlatform = gameScene?.scene.add.image(0, 0, 'items', Icons.KEY);
        ghostPlatform?.setDisplaySize(45, 45);
        break;
      case UIButton.NewRock:
        ghostPlatform = gameScene?.scene.add.image(0, 0, 'rock');
        break;
      case UIButton.NewPowerup:
        ghostPlatform = gameScene?.scene.add.image(0, 0, 'bonus', powerUpButton?.frame.name);
        ghostPlatform?.setDisplaySize(BONUS_SIZE, BONUS_SIZE);
        break;
      default:
        if (ghostPlatform) {
          ghostPlatform.destroy(true);
          ghostPlatform = undefined;
        }
        break;
    }

    if (ghostPlatform) {
      ghostPlatform.setAlpha(.3);
      ghostPlatform.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        const mouseX = game.input.mousePointer?.x ?? 0, mouseY = game.input.mousePointer?.y ?? 0;
        switch (uiIndex) {
          case UIButton.NewPlatform:
            {
              const key = 'ground';
              const id = makeId(key);
              const p: Phaser.Physics.Arcade.Image = createPlatform(platforms, id, key,
                mouseX, mouseY,
                50, 50, {});
              p.preFX?.addGlow(0x000000, 0, 1, false);
              movePlatform(key, id, p, {
                leftEdge: false, rightEdge: false, topEdge: false, bottomEdge: false,
              }, undefined, () => {
                if (!ghostPlatform) {
                  setUiIndex(-1);
                }
              }, true);
            }
            break;
          case UIButton.NewHuman:
            {
              const scene = gameScene?.scene;
              if (scene) {
                const human = new Human(scene, mouseX, mouseY, humanGroup);
                const key = 'human';
                const id = makeId(key);
                const indicOptions = {
                  indicKey: "items",
                  onDelete(_: any, indic: any) {
                    const human = indic.human;
                    human.destroy();
                    const index = humans.findIndex(h => h === human);
                    humans.splice(index, 1);
                  },
                  onCreate: (oldIndic: any, id?: string) => {
                    const { x, y } = oldIndic;
                    const human = new Human(scene, x, y, humanGroup);
                    const indic = createDynamic(indicators, undefined, id, "human", x, y, 54, undefined, undefined, human.player, indicOptions);
                    (indic as any).human = human;
                    (human.player as any).indic = indic;
                    humans.push(human);
                    return human.player;
                  },
                };
                const indic = createDynamic(indicators, undefined, id, "human", mouseX, mouseY, 54, undefined, undefined, human.player, indicOptions);
                (human as any).indic = indic;
                (indic as any).human = human;
                humans.push(human);
                movePlatform(key, id, indic, {
                  leftEdge: false, rightEdge: false, topEdge: false, bottomEdge: false,
                }, undefined, (didMove) => {
                  if (didMove) {
                    human.player.setPosition(indic.x, indic.y);
                  }
                  if (!ghostPlatform) {
                    setUiIndex(-1);
                  }
                }, true);
              }
            }
            break;
          case UIButton.NewDoor:
            {
              const key = 'door';
              const id = makeId(key);
              const d = createPlatform(doorGroup, id, 'door', mouseX, mouseY, undefined, undefined, {
                noResize: true,
              });
              d.setBodySize(40, 64);
              (d as any).anims.play("door");
              movePlatform(key, id, d, {
                leftEdge: false, rightEdge: false, topEdge: false, bottomEdge: false,
              }, undefined, () => {
                if (!ghostPlatform) {
                  setUiIndex(-1);
                }
              }, true);
            }
            break;
          case UIButton.NewKey:
            {
              const key = 'key';
              const id = makeId(key);
              const b = createDynamic(indicators, keyGroup, id, 'key', mouseX, mouseY, 0, 45, 45, undefined, {
                onCopy(b: any) {
                  (b as any).anims.play('key_anim');
                  (b as any).isKey = true;
                  b.setDamping(true);
                  b.setDrag(.01);
                  b.setCollideWorldBounds(true);
                  b.preFX?.addGlow(0xccffff, 1);
                  b.indic.key = b;
                },
              });
              if (b) {
                (b as any).anims.play('key_anim');
                (b as any).isKey = true;
                b.setDamping(true);
                b.setDrag(.01);
                b.setCollideWorldBounds(true);
                b.preFX?.addGlow(0xccffff, 1);
                b.indic.key = b;
              }
              movePlatform(key, id, b.indic, {
                leftEdge: false, rightEdge: false, topEdge: false, bottomEdge: false,
              }, undefined, (didMove) => {
                if (didMove) {
                  b.setPosition(b.indic.x, b.indic.y);
                }
                if (!ghostPlatform) {
                  setUiIndex(-1);
                }
              }, true);
            }
            break;
          case UIButton.NewRock:
            {
              const key = 'rock';
              const id = makeId(key);
              const object = createDynamic(indicators, rocks, id, 'rock', mouseX, mouseY, 0);
              object.body?.gameObject?.setPushable(false);
              object.body?.gameObject?.setDamping(true);
              object.body?.gameObject?.setDrag(.01);
              object.body?.gameObject?.setCollideWorldBounds(true);
              (object as any).indic.rock = object;

              movePlatform(key, id, object.indic, {
                leftEdge: false, rightEdge: false, topEdge: false, bottomEdge: false,
              }, undefined, (didMove) => {
                if (didMove) {
                  object.setPosition(object.indic.x, object.indic.y);
                }
                if (!ghostPlatform) {
                  setUiIndex(-1);
                }
              }, true);
            }
            break;
          case UIButton.NewWater:
            {
              const key = 'water';
              const id = makeId(key);
              const b = createPlatform(waterGroup, id, 'water', mouseX, mouseY, 64, 64);//, width ?? 64, height ?? 64);
              if (b) {
                (b as any).anims.play({ key: 'water', randomFrame: true });
                (b as any).setBodySize(64, 64 / 3);
              }
              movePlatform(key, id, b, {
                leftEdge: false, rightEdge: false, topEdge: false, bottomEdge: false,
              }, undefined, () => {
                if (!ghostPlatform) {
                  setUiIndex(-1);
                }
              }, true);
            }
            break;
          case UIButton.NewPowerup:
            {
              const key = 'bonus';
              const id = makeId(key);
              const bonus = createDynamic(indicators, bonusGroup, id, 'bonus', mouseX, mouseY, ghostPlatform?.frame.name, BONUS_SIZE, BONUS_SIZE, undefined, {
                onDelete(bonus) {
                  (bonus as any).triangle?.destroy(true);
                  (bonus as any).triangle_back?.destroy(true);
                },
                onCopy: (result, id) => {
                  const scene = gameScene?.scene;
                  if (scene) {
                    makeBonusChangeTriangle(scene, result, id);
                  }
                  bonuses.push(result);
                  result?.body?.gameObject?.setPushable(false);
                  result?.body?.gameObject?.setDamping(true);
                  result?.body?.gameObject?.setDrag(.01);
                  result?.body?.gameObject?.setCollideWorldBounds(true);
                  result?.body?.gameObject?.preFX.addGlow(0xffffcc, 1);
                  if (result) {
                    (result as any).indic.bonus = result;
                  }
                },
              });
              const scene = gameScene?.scene;
              if (scene) {
                makeBonusChangeTriangle(scene, bonus, id);
              }

              bonus.body?.gameObject?.setPushable(false);
              bonus.body?.gameObject?.setDamping(true);
              bonus.body?.gameObject?.setDrag(.01);
              bonus.body?.gameObject?.setCollideWorldBounds(true);
              bonus.body?.gameObject?.preFX.addGlow(0xffffcc, 1);
              bonus.indic.bonus = bonus;
              bonuses.push(bonus);

              movePlatform(key, id, bonus.indic, {
                leftEdge: false, rightEdge: false, topEdge: false, bottomEdge: false,
              }, undefined, (didMove) => {
                if (didMove) {
                  bonus.setPosition(bonus.indic.x, bonus.indic.y);
                }
                if (!ghostPlatform) {
                  setUiIndex(-1);
                }
              }, true);
            }
            break;
        }
        if (!cursors?.shift.isDown) {
          ghostPlatform?.destroy();
          ghostPlatform = undefined;
        }
      });
    }
    if (uiIndex < 0) {
      ui.showPower();
    }
  }

  let cancelButtonIndex = -1;
  let uiIndex = -1;
  const uiBacks: Phaser.GameObjects.Image[] = [];

  const cursorsPerUi: (string[] | undefined)[] = [
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    ["url(cursor/trash-icon.cur), pointer", "url(cursor/trash-icon-open.cur), pointer"],
    undefined,
  ];
  let powerUpButton: Phaser.GameObjects.Image | undefined;
  function createUIButton(
    scene: Phaser.Scene,
    index: number,
    key: string,
    icon: Icons | number,
    cursor: string,
    desc: string,
    cancelButton: boolean = false) {
    if (cancelButton) {
      cancelButtonIndex = index;
    }
    const px = GAMEWIDTH - 540 + index * 42;
    const py = GAMEHEIGHT - 30;
    const iconBack = scene.add.image(px, py, 'items', Icons.BLUE_FRAME);
    uiBacks[index] = iconBack;
    iconBack.preFX?.addShadow();
    iconBack.setDisplaySize(36, 36);
    iconBack.setInteractive({ useHandCursor: true });
    iconBack.setFrame(cancelButton ? Icons.CANCEL : uiIndex === index ? Icons.GREEN_FRAME : Icons.BLUE_FRAME);
    const button = scene.add.image(px, py, key, icon);
    if (index === UIButton.NewPowerup) {
      powerUpButton = button;
    }
    button.setDisplaySize(30, 30);
    iconBack.on('pointerover', () => {
      iconBack.postFX.addGlow(0xffffff, 2);
      if (uiIndex < 0) {
        ui?.showPower(desc, button);
      }
    });
    iconBack.on('pointerout', () => {
      iconBack.postFX.clear();
      if (uiIndex < 0) {
        ui?.showPower();
      }
    });
    iconBack.on('pointerdown', () => {
      setUiIndex(!cancelButton ? index : -1);
      gameScene?.scene.input.setDefaultCursor(getUiCursor() ?? cursor);
    });
    const arrow = scene.add.sprite(GAMEWIDTH / 2, GAMEHEIGHT - 24, 'items', Icons.ARROW);
    arrow.play('yellow_arrow');
    arrow.setVisible(false);

  }

  class Elem {
    dx: number = 0;
    airborne: number = 0;
    landed: number = 0;
    lastFrameOnGround = false;
    carriedBy?: Troll;
    thrownDx = 0;
    preX: number = 0;
    lastStill: number = 0;
    frozen?: number;
    surprised: number = 0;

    constructor(protected sprite: string, public player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
      this.player.setBounce(0.2);
      this.player.setCollideWorldBounds(true);
      this.player.body.useDamping = true;
      this.player.setBodySize(20, this.player.body.height);
    }

    getSurprised(jumpStrength: number = 300) {
      this.surprised = Date.now();
      if (jumpStrength && this.player.body.touching.down && !this.frozen) {
        this.player.setVelocity(0, -jumpStrength);
      }
    }
  }

  class Troll extends Elem {
    trollSprites: Phaser.GameObjects.Sprite[] = [];
    mouthSprites: Phaser.GameObjects.Sprite[] = [];
    holdingBonus: Phaser.GameObjects.GameObject | undefined;
    holdingTemp: Phaser.GameObjects.GameObject | undefined;
    lastHold: number = 0;
    lastThrow: number = 0;
    destroyed?: boolean;
    vanishing: number = 0;
    onPlatform?: Phaser.Types.Physics.Arcade.GameObjectWithBody;
    isTroll = true;
    humanBrain?: Human;
    #crouch = false;
    initialHeight: number;

    set crouch(value: boolean) {
      if (this.#crouch !== value) {
        if (!value) {
          const playerBounds = this.player.getBounds();
          playerBounds.y -= 16;
          playerBounds.height = this.initialHeight;
          for (const platform of platforms.getChildren()) {
            if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, platform.body?.gameObject.getBounds())) {
              return;
            }
          }
        }
        this.#crouch = value;
        this.player.setPosition(this.player.x, this.player.y + (this.#crouch ? 16 : -16));
        this.player.setBodySize(20, this.initialHeight * (this.#crouch ? .3 : 1));
      }
    }

    constructor(scene: Phaser.Scene, x: number, y: number, public trollGroup: Phaser.Physics.Arcade.Group, hue: number = 0, private playerId: number = 1) {
      super('troll', scene.physics.add.sprite(x, y, 'troll', 1));
      this.player.body.allowDrag = true;
      this.player.setDrag(.01);
      //      this.player.setPushable(false);
      (window as any).troll = this;

      (this.player as any).troll = this;

      this.trollSprites.push(scene.add.sprite(0, 0, "troll", 0));
      this.mouthSprites.push(scene.add.sprite(0, 0, 'troll', 31));
      this.mouthSprites.forEach(sprite => sprite.setVisible(false));
      this.trollSprites.forEach(sprite => {
        if (hue) {
          sprite.preFX?.addColorMatrix().hue(hue);
        }
      });
      trollGroup.add(this.player);
      this.initialHeight = this.player.body.height;
    }

    destroy() {
      if (this.holdingBonus) {
        this.releaseHoldingBonus(this.holdingBonus);
        this.holdingBonus = undefined;
      }
      if (this.humanBrain) {
        this.humanBrain.trollBrain = undefined;
        this.humanBrain = undefined;
      }
      this.destroyed = true;
      this.player.destroy(true);
      this.trollSprites.forEach(sprite => {
        sprite.destroy(true);
      });
      this.mouthSprites.forEach(sprite => {
        sprite.destroy(true);
      });
    }

    setTint(color: number) {
      this.trollSprites.forEach(sprite => sprite.setTint(color));
    }

    setFlipX(flipX: boolean) {
      this.player.setFlipX(flipX);
      this.trollSprites.forEach(sprite => sprite.setFlipX(flipX));
      this.mouthSprites.forEach(sprite => sprite.setFlipX(flipX));
      this.holdingBonus?.body?.gameObject.setFlipX(flipX);
      const h = (this.holdingBonus as any)?.troll ?? (this.holdingBonus as any)?.human;
      h?.setFlipX(flipX);
      (this.holdingBonus as any)?.troll?.setRotation(- Math.PI / 2 + Math.PI / 8);
      (this.holdingBonus as any)?.human?.setRotation(- Math.PI / 2);
    }

    grounded() {
      return this.player.body?.touching.down || this.player.body?.onFloor();
    }

    update(dt: number = 1, zzfx: any) {
      if (this.destroyed) {
        return;
      }
      let notMoving = false;
      const now = Date.now();
      if (this.humanBrain) {
        if (!this.dx || this.lastStill && now - this.lastStill > 3000) {
          if (now - this.surprised > 3000) {
            this.dx = !this.dx ? 1 : -this.dx;
          }
          this.lastStill = now;
        }

        if (Math.abs(this.preX - this.player.x) < 1 * this.player.scale) {
          if (!this.lastStill) {
            this.lastStill = now;
          }
          notMoving = true;
        } else {
          this.lastStill = 0;
        }
      }


      this.player.setDrag(this.grounded() ? .0000001 : 1);

      this.trollSprites.forEach(sprite => sprite.setPosition(this.player.x, this.player.y - 6 - (this.#crouch ? 16 : 0)));
      this.mouthSprites.forEach(sprite => sprite.setPosition(this.player.x, this.player.y - 6));

      if (this.thrownDx && (!this.dx || this.humanBrain)) {
        this.player.setVelocityX(this.thrownDx);
        this.thrownDx *= .9;
        if (Math.abs(this.thrownDx) < .1) {
          this.thrownDx = 0;
        }
      } else if (this.dx && !this.carriedBy) {
        this.thrownDx = 0;
        const speed = this.humanBrain ? 80 : this.airborne ? 200 : this.#crouch ? 50 : 150;
        this.player.setVelocityX(speed * this.dx * dt);
        const flipX = this.dx < 0;
        this.setFlipX(flipX);
      } else {
        this.player.setVelocityX(this.player.body.velocity.x * .5);
      }
      if (this.onPlatform) {
        if (!this.grounded()) {
          this.onPlatform = undefined;
        } else {
          this.player.x += this.onPlatform.body.deltaX() * 2;
          this.player.y += this.onPlatform.body.deltaY() * 2;
        }
      }

      if (this.lastThrow && Date.now() - this.lastThrow < 400) {
        this.trollSprites.forEach((sprite, index) => sprite.anims.play('troll_throw', true));
      } else if (this.airborne) {
        if (now - this.airborne < 100) {
          this.trollSprites.forEach((sprite, index) => sprite.anims.play(this.holdingBonus ? 'troll_hold_jump' : 'troll_jump', true));
        } else if (this.player.body.velocity.y <= 0) {
          this.trollSprites.forEach((sprite, index) => sprite.anims.play(this.holdingBonus ? 'troll_hold_air' : 'troll_air', true));
        } else {
          this.trollSprites.forEach((sprite, index) => sprite.anims.play(this.holdingBonus ? 'troll_hold_land' : 'troll_land', true));
        }
      } else if (Date.now() - this.landed < 200) {
        this.trollSprites.forEach((sprite, index) => sprite.anims.play(this.holdingBonus ? 'troll_hold_landed' : `troll_landed`, true));
      } else if (!this.dx || notMoving) {
        if (this.#crouch) {
          this.trollSprites.forEach((sprite, index) => {
            const animKey = this.holdingBonus ? 'troll_hold_crouch' : 'troll_crouch';
            if (sprite.anims.currentAnim?.key !== animKey) {
              sprite.anims.play(animKey, true);
            }
          });
        } else {
          this.trollSprites.forEach((sprite, index) => sprite.anims.play(this.holdingBonus ? 'troll_hold_still' : `troll_still`, true));
        }
        this.mouthSprites.forEach((sprite, index) => sprite.anims.play('troll_talk_still', true));
      } else {
        if (this.#crouch) {
          this.trollSprites.forEach((sprite, index) => sprite.anims.play(this.holdingBonus ? 'troll_hold_crouch_walk' : 'troll_crouch_walk', true));
        } else {
          this.trollSprites.forEach((sprite, index) => sprite.anims.play(this.holdingBonus ? 'troll_hold_walk' : `troll_walk`, true));
        }
        this.mouthSprites.forEach((sprite, index) => sprite.anims.play('troll_talk_walk', true));
      }
      const heldBonus = this.holdingTemp ?? this.holdingBonus;
      if (heldBonus) {
        const trollSprite = this.trollSprites[0];
        const frame = trollSprite.frame.name;
        let holdShift = 0, holdShiftX = 0;
        switch (parseInt(frame)) {
          case 13: case 16: case 25: case 28: case 29: case 30:
            holdShift = -2 * trollSprite.scaleY;
            break;
          case 14: case 17: case 26:
            holdShift = -1 * trollSprite.scaleY;
            break;
          case 41:
            holdShift = -1 * trollSprite.scaleY;
            holdShiftX = -1 * trollSprite.scaleX;
            break;
        }
        heldBonus.body?.gameObject.setPosition(this.player.x - (this.holdingTemp ? 30 : 0) * this.dx + holdShiftX * this.dx, this.player.y - ((heldBonus as any).isKey ? 20 : (heldBonus as any).human ? 40 : 40) + holdShift);
      }

      const touchingDown = this.grounded();
      if (this.airborne && Date.now() - this.airborne > 200 && touchingDown) {
        this.airborne = 0;
        this.landed = Date.now();
      }

      this.lastFrameOnGround = touchingDown;
      this.preX = this.player.x;
    }

    tryJump(zzfx: any, forceAllowJump: boolean = false) {
      if (this.grounded() || forceAllowJump) {
        if (!this.airborne) {
          this.crouch = false;
          if (this.#crouch) {
            return;
          }
          zzfx(...[, , 198, .04, .07, .06, , 1.83, 16, , , , , , , , , .85, .04]); // Jump
          this.airborne = Date.now();
          if (this.carriedBy) {
            const gameObject = this.carriedBy.holdingBonus?.body?.gameObject;
            (gameObject as any).enableBody(true, this.player.x, this.player.y - 25, true, true);
            this.setRotation(0);
            this.carriedBy.holdingBonus = undefined;
            this.carriedBy = undefined;
          }

          this.player.setVelocityY(game.loop.actualFps < 35 ? -1300 : -1000);
        }
      }
    }

    setScale(scaleX: number, scaleY: number, displayScaleX: number, displayScaleY: number) {
      this.player.setScale(scaleX, scaleY);
      this.trollSprites.forEach(sprite => sprite.setScale(displayScaleX, displayScaleY));
      this.mouthSprites.forEach(sprite => sprite.setScale(displayScaleX, displayScaleY));
    }

    foreObject(group: Phaser.Physics.Arcade.Group, condition?: (item: Phaser.GameObjects.GameObject) => boolean) {
      for (let item of group.getChildren()) {
        const gameObject = item.body?.gameObject;
        if (!item.active || (condition && !condition(item))) {
          continue;
        }
        if (this.#crouch) {
          const px = gameObject.x - this.player.x;
          const py = gameObject.y - this.player.y;
          const dx = this.player.flipX ? -1 : 1;
          if (Math.abs(py) <= 60 && py > 0 && Math.abs(px) < 30) {
            return item;
          }
        } else {
          const px = gameObject.x - this.player.x;
          const py = gameObject.y - this.player.y;
          const dx = this.player.flipX ? -1 : 1;
          if (Math.abs(px) <= 60 && px * dx > 0 && Math.abs(py) < 30) {
            return item;
          }
        }
      }
      return null;
    }

    setRotation(angle: number) {
      this.trollSprites.forEach(sprite => sprite.setRotation(this.player.flipX ? -angle : angle));
      this.mouthSprites.forEach(sprite => sprite.setRotation(this.player.flipX ? -angle : angle));
    }

    get tossKey() {
      return this.playerId === 2 || trolls.length === 1 ? 'P' : 'F';
    }

    releaseHoldingBonus(holdingBonus: any) {
      if (holdingBonus) {
        const dx = this.player.flipX ? -1 : 1;
        const gameObject = holdingBonus.body?.gameObject;
        (gameObject as any).enableBody(true, this.player.x - dx * 5, this.player.y - 25, true, true);
        (holdingBonus.body as any).setVelocityX(dx * 1500);
        (holdingBonus.body as any).setBounce(.1);
        (holdingBonus as any).debugShowBody = true;
      }
    }

    hold(group: Phaser.Physics.Arcade.Group, zzfx: any, ui?: UI, { isKey, isTroll, isHuman, condition }: {
      isTroll?: boolean;
      isBonus?: boolean;
      isKey?: boolean;
      isHuman?: boolean;
      condition?: (item: Phaser.GameObjects.GameObject) => boolean;
    } = {}) {
      if (Date.now() - this.lastHold < 200) {
        return;
      }
      if (!this.holdingBonus) {
        const item = this.foreObject(group, condition);
        if (item) {
          this.holdingBonus = item;
          this.crouch = false;
          (item as any).disableBody(true, false);
          (item as any).isKey = isKey;
          (item as any).debugShowBody = false;
          zzfx(...[, , 763, .01, .09, .11, , 1.14, 5.9, , 176, .03, , , , , , .7, .04]); // Pickup 250
          if (isKey) {
            (item as any).setFrame(41);
          }
          if (isTroll || isHuman) {
            const obj = (item as any).troll ?? (item as any).human;
            obj.setFlipX(this.player.flipX);
            obj.setRotation(isHuman ? - Math.PI / 2 : - Math.PI / 2 + Math.PI / 8);
            obj.carriedBy = this;
          }

          this.lastHold = Date.now();

          const bonus: any = this.holdingBonus;
          if (bonus) {
            if (isKey || isTroll) {
              ui?.showPower(`Press ${this.tossKey} again to toss`, bonus);
            } else {
              ui?.showPower(POWER_DESC[parseInt(bonus.frame.name) as Bonus], bonus);
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
          (gameObject as any).enableBody(true, this.player.x - dx * 5, this.player.y - 25, true, true);
          (holdingBonus.body as any).setVelocityX(dx * 1500);
          (holdingBonus.body as any).setBounce(.1);
          (holdingBonus as any).debugShowBody = true;
          (gameObject as any).refreshBody();
          const h = (holdingBonus as any).troll ?? (holdingBonus as any).human;
          if (h) {
            h.thrownDx = dx * 1000;
            h.setRotation(0);
            h.carriedBy = undefined;
            if (h.flyingLevel) {
              h.flyingLevel = h.player.y;
            }
          }
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
      this.mouthSprites.forEach(sprite => sprite.setVisible(false));
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

    addHistory(event: HumanEvent) {
      if (this.humanBrain && this.humanBrain.history[this.humanBrain.history.length - 1] !== event) {
        this.humanBrain.history.push(event);
      }
    }
  }

  let lastDialog = Date.now();

  class Human extends Elem {
    faceSprites: Phaser.GameObjects.Sprite[] = [];
    bodySprites: Phaser.GameObjects.Sprite[] = [];
    powerAcquired: number = 0;
    holdingBonus: Phaser.GameObjects.GameObject | undefined;
    seed: string = "";
    born: number;
    flyingLevel?: number;
    antMan?: number;
    normalMan?: number;
    unfrozen: number = 0;
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
    isTroll = false;
    humansFrozen: Set<Human> = new Set();
    forceMouth?: number;
    trollBrain?: Troll;

    constructor(scene: Phaser.Scene, x: number, y: number,
      private humanGroup: Phaser.Physics.Arcade.Group, seed?: any) {
      super('hi', scene.physics.add.sprite(x, y, 'hi', EMPTY_FACE_ENUM));
      // this.player.setPushable(false);
      // scene.physics.add.collider(this.player, platforms);
      humanGroup.add(this.player);
      (this.player as any).human = this;
      this.player.setCollideWorldBounds(true);
      this.player.setBodySize(35, this.player.body.height).refreshBody();

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
        scene.add.sprite(x, y, "hi", 81),  //  bib
        scene.add.sprite(x, y, "hi", 82),  //  gold_chain
        scene.add.sprite(x, y, "hi", 85),  //  scarf
        scene.add.sprite(x, y, "hi", 87),  //  headphones_right

        scene.add.sprite(x, y, "hi", 36),  //  face
        scene.add.sprite(x, y, "hi", 41),  //  mouth
        scene.add.sprite(x, y, "hi", 46),  //  nose
        scene.add.sprite(x, y, "hi", 51),  //  eyes
        scene.add.sprite(x, y, "hi", 57),  //  eyelashes
        scene.add.sprite(x, y, "hi", 76),  //  glasses
        scene.add.sprite(x, y, "hi", 61),  //  hair

        scene.add.sprite(x, y, "hi", 66),  //  hat

        scene.add.sprite(x, y, "hi", 86),  //  headphones_left
        scene.add.sprite(x, y, "hi", 83),  //  bunny_ear
        scene.add.sprite(x, y, "hi", 84),  //  flower

      );
      this.randomize(seed ?? Math.random());
      this.born = Date.now();
      const rng = alea(this.seed + "");
      this.humanScaleX = rng() / 3 + 1;
      this.humanScaleY = rng() / 3 + 1;
      this.setScale(1, this.humanScaleX ?? 1, this.humanScaleY ?? 1);
      if (this.faceSprites[FaceEnum.HAT].frame.name != EMPTY_FACE_ENUM.toString()) {
        this.addHistory(HumanEvent.HAT);
      }

      FACE_ACCESSORIES.forEach(accessory => {
        const h = ACCESORY_TO_EVENT[accessory];
        if (h && this.faceSprites[accessory].visible && this.faceSprites[accessory].frame.name != EMPTY_FACE_ENUM.toString()) {
          this.addHistory(h);
        }
      });

      switch (this.faceSprites[FaceEnum.GLASSES].frame.name + "") {
        case "76":  //  retro
          this.addHistory(HumanEvent.RETRO_SHUTTER_SHADES);
          break;
        case "77":  //  eyepatch
          this.addHistory(HumanEvent.EYE_PATCH);
          break;
        case "78":  //  glasses
        case "79":
          this.addHistory(HumanEvent.GLASSES);
          break;
        case "80":  //  VR
          this.addHistory(HumanEvent.VR_HEADSET);
          break;
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
      if (!this.trollBrain && this.history[this.history.length - 1] !== event) {
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

    randomize(seed: any) {
      if (this.vanishing) {
        return;
      }
      this.seed = seed + "";
      this.clearTint();
      randomSprite(this.seed, this.faceSprites, this.bodySprites, this.naked, this.invisible, this.forceMouth);
      if (this.frozen) {
        this.setTint(0x0077FF);
        this.bodySprites.forEach(sprite => sprite.preFX?.addGlow(0xffffff, 2));
        this.faceSprites.forEach(sprite => sprite.preFX?.addGlow(0xffffff, 2));
      } else {
        this.bodySprites.forEach(sprite => sprite.preFX?.clear());
        this.faceSprites.forEach(sprite => sprite.preFX?.clear());
      }
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
      this.faceSprites.forEach((sprite, idx) => sprite.setFlipX(idx === FaceEnum.GOLD_CHAIN ? false : flipX));
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
      this.vanishing = 0;
      this.randomize(this.seed);
      if (this.flyingLevel) {
        this.flyingLevel = this.player.y - 50;
      }
      this.getSurprised(0);
    }

    closestHuman(forceElems?: any[]) {
      let min = Number.MAX_SAFE_INTEGER;
      let closest: Human | Troll | undefined;
      const elems = forceElems ?? [...humans, ...trolls];
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

    freeze(human: Human) {
      human.getFrozen();
      this.addHistory(HumanEvent.FREEZE);
      this.humansFrozen.add(human);
    }

    getFrozen() {
      this.getSurprised(0);
      this.frozen = Date.now();
      zzfx(...[1.52, , 1177, .23, .09, .09, 1, 1.41, 12, , , , , .4, , , .06, .25, .11, .11]); // Random 348
      this.player.setPushable(false);

      this.bodySprites.forEach((sprite, index) => sprite.anims.pause());
      this.player.setVelocityX(0);
      if (this.speaking) {
        speechSynthesis.cancel();
        ui.chat("");
      }
      this.randomize(this.seed);
    }

    unFreeze() {
      this.frozen = 0;
      this.unfrozen = Date.now();
      this.player.setPushable(true);
      this.randomize(this.seed);
      this.addHistory(HumanEvent.GOT_UNFROZEN);
      this.getSurprised();
    }

    setRotation(angle: number) {
      this.bodySprites.forEach(sprite => sprite.setRotation(this.player.flipX ? -angle : angle));
      this.faceSprites.forEach(sprite => sprite.setRotation(this.player.flipX ? -angle : angle));
    }

    update(dt: number = 1, zzfx: any) {
      const now = Date.now();
      //  AI
      if (!this.trollBrain) {
        if (now - this.born > 2000) {
          if (!this.dx || this.lastStill && now - this.lastStill > 3000 && !(now - this.firstTimePush < 5000)) {
            this.dx = !this.dx ? 1 : -this.dx;
            this.lastStill = now;
          }
        }
      }

      if (this.inWater) {
        // this.dx = 0;
        if (now - this.inWater > 500) {
          this.inWater = 0;
        }
      }

      if (this.imBlue) {
        this.bodySprites[BodyEnum.BODY].setTint(0x0099FF);
        this.faceSprites[FaceEnum.SHAPE].setTint(0x0099FF);
      }

      if (this.antMan && now - this.antMan < 1000) {
        const progress = (now - this.antMan) / 1000;
        this.setScale(1 - .7 * progress, this.humanScaleX - .7 * progress, this.humanScaleY - .7 * progress);
      } else if (this.normalMan) {
        if (now - this.normalMan < 1000) {
          const progress = (now - this.normalMan) / 1000;
          this.setScale(1 - .7 * progress, this.humanScaleY - .7 * (1 - progress), this.humanScaleY - .7 * (1 - progress));
        } else {
          this.setScale(1, this.humanScaleX, this.humanScaleY);
          this.normalMan = 0;
        }
      }

      if (this.acquiringPower()) {
        this.setTint(Math.floor(0xffffff * Math.random()));
        this.setRotation(Math.random() * Math.PI * 2);
        this.bodySprites.forEach((sprite, index) => sprite.anims.pause());
      } else if (this.powerAcquired) {
        this.setRotation(0);

        this.lastStill = now;
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
                  const offsetY = ch.isTroll ? 48 / 2 - 64 / 2 : 0
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
      const scaleShift = -(this.humanScaleY - 1) * 20 + 1;
      const sink = this.inWater ? -5 * Math.sin(now / 300) : 0;
      this.bodySprites.forEach(sprite => sprite.setPosition(this.player.x, this.player.y + scaleShift + sink));
      this.faceSprites.forEach(sprite => sprite.setPosition(this.player.x, this.player.y + scaleShift + sink + 2 * headShift * this.player.scale));

      if (this.holdingBonus) {
        this.holdingBonus.body?.gameObject.setPosition(this.player.x, this.player.y - 50 * this.player.scale);
      }

      if (this.powerAcquired) {
        this.player.setVelocityX(0);
      } else {
        if (this.frozen && this.thrownDx) {
          this.player.setVelocityX(this.thrownDx);
          this.thrownDx *= .9;
          if (Math.abs(this.thrownDx) < .1) {
            this.thrownDx = 0;
          }
        } else if (this.dx) {
          const paused = this.frozen || now - this.unfrozen < 3000 || (now - this.sawTroll < 2000 || this.inWater || now - this.firstTimePush < 3000 && now - this.firstTimePush > 1000);
          const speed = this.airborne ? (this.trollBrain ? 100 : 200) : paused ? 0 : 80;
          this.player.setVelocityX(speed * this.dx * dt * this.player.scale);
          if (!this.frozen) {
            const flipX = this.dx < 0;
            this.setFlipX(flipX);
            this.thrownDx = 0;
          }
          if (paused) {
            this.lastStill = now;
          }
        } else {
          this.player.setVelocityX(this.player.body.velocity.x * .5);
        }

        if (this.flyingLevel) {
          if (this.player.y >= this.flyingLevel) {
            this.player.setVelocityY(-10);
          } else {
            this.player.setVelocityY(0);
          }
        }

        if (!this.frozen) {
          if (Math.abs(this.preX - this.player.x) < 1.5 * this.player.scale) {
            this.bodySprites.forEach((sprite, index) => sprite.anims.play(this.flyingLevel ? `fly_${index}` : `still_${index}`, true));
            if (!this.lastStill) {
              this.lastStill = now;
            }
          } else {
            this.bodySprites.forEach((sprite, index) => sprite.anims.play(this.flyingLevel ? `fly_${index}` : `walk_${index}`, true));
            this.lastStill = 0;
          }
        }
        this.preX = this.player.x;
      }
      if (this.airborne && now - this.airborne > 200 && this.player.body.touching.down) {
        this.airborne = 0;
        this.landed = now;
      }

      if (!this.trollBrain) {
        if (!this.player.body.touching.down && this.lastFrameOnGround) {
          if (this.holdingBonus && parseInt((this.holdingBonus as any).frame.name) === 0) {
            this.tryJump(zzfx, true);
          }
        }
      }

      this.lastFrameOnGround = this.player.body.touching.down;
      if (this.lastFrameOnGround) {
        this.groundY = this.player.y;
      }

      if (!this.trollBrain) {
        if (this.surprised) {
          this.faceSprites[FaceEnum.MOUTH].setFrame(OPEN_MOUTH);
          if (now - this.surprised > 2000 && !this.frozen) {
            this.surprised = 0;
            this.randomize(this.seed);
          }
        }
      }
    }

    foundOutJump = 0;
    tryJump(zzfx: any, forceAllowJump?: boolean, strength?: number) {
      if (this.player.body.touching.down || forceAllowJump) {
        this.player.setVelocityY((strength ?? -800) * this.player.scale);
        zzfx(...[.2, , 198, .04, .07, .06, , 1.83, 16, , , , , , , , , .85, .04]); // Jump 252
        this.airborne = Date.now();
        if (!this.trollBrain && Date.now() - this.foundOutJump > 10000) {
          this.foundOutJump = Date.now();
          this.addHistory(HumanEvent.SUPER_JUMP);
        }
      }
    }

    speakSeed: number | undefined;
    spokenHistory = 0;
    speakAI() {
      if (this.spokenHistory < this.history.length && !someoneSpeaking) {
        if (this.speaking && Date.now() - this.speaking < 10000 || !document.hasFocus() || this.frozen) {
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
          //          console.log("Speak", result);
          this.speak(result.response);
        });
        this.addHistory(HumanEvent.CHAT);
      } else {

      }
    }

    setScale(playerScale: number, scaleX: number, scaleY: number) {
      this.player.setScale(playerScale);
      [...this.bodySprites, ...this.faceSprites].forEach(sprite => {
        sprite.setScale(scaleX, scaleY);
      });
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
          (this.holdingBonus as any).setVelocity(800 * Math.sign(this.dx), -200);
          (this.holdingBonus as any).debugShowBody = true;
        } else {
          this.holdingBonus.destroy(true);
        }
      }
      this.player.setVelocityY(0);

      this.holdingBonus = bonus;
      (bonus as any).disableBody(true, false);
      bonus.body?.gameObject.setAlpha(.5);
      (bonus as any).setDisplaySize(32, 32).refreshBody();
      (bonus as any).debugShowBody = false;


      if (newPowerFrame !== lostPowerFrame) {
        if (lostPowerFrame === Bonus.LEVITATE) {
          this.addHistory(HumanEvent.DROP_DOWN);
        } else if (lostPowerFrame === Bonus.SHRINK) {
          this.addHistory(HumanEvent.EXPAND);
        } else if (lostPowerFrame === Bonus.FREEZE) {
          if (this.humansFrozen.size) {
            setTimeout(() => {
              zzfx(...[1.52, , 1177, .23, .09, .09, 1, 1.41, 12, , , , , .4, , , .06, .25, .11, .11]); // Random 348
              this.humansFrozen.forEach(human => human.unFreeze());
              this.humansFrozen.clear();
            }, 1000);
          }
        } else if (lostPowerFrame === Bonus.BRAIN_SWAP && this.trollBrain) {
          this.trollBrain.humanBrain = undefined;
          this.trollBrain = undefined;
          this.addHistory(HumanEvent.RESTORED_HUMAN_BRAIN);
          this.getSurprised();
        }
      }

      if (newPowerFrame === Bonus.LEVITATE) {
        //  flying
        this.player.body.setAllowGravity(false);
        this.flyingLevel = (this.flyingLevel ?? (this.groundY ? Math.max(this.groundY, this.player.y) : undefined) ?? this.player.y) - 50;
        //console.log(this.flyingLevel);
        setTimeout(() => {
          this.getSurprised(0);
        }, 1000);
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
        this.getSurprised(0);
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
        case Bonus.BRAIN_SWAP:
          const closestTroll = this.closestHuman(trolls) as Troll;
          closestTroll.humanBrain = this;
          closestTroll.dx = 0;
          closestTroll.player.setVelocityX(0);
          closestTroll.getSurprised(0);
          setTimeout(() => {
            closestTroll.dx = 0;
            closestTroll.getSurprised();
          }, 500);
          this.trollBrain = closestTroll;
          this.player.setVelocityX(0);
          // this.history.length = 0;
          // this.spokenHistory = 0;
          closestTroll.addHistory(HumanEvent.TROLL_BRAIN);
          break;
        case Bonus.GEMINI:
          setTimeout(() => {
            const { x, y } = this.player;
            this.dx = -1;
            const human = new Human(this.player.scene, x + 20, y, this.humanGroup, this.seed);
            human.dx = 1;
            this.randomize(this.seed);
            human.forceMouth = this.faceSprites[FaceEnum.MOUTH].frame.name === HUMAN_ANIM.FACE_MOUTH_SMILE[0].toString()
              ? HUMAN_ANIM.FACE_MOUTH_NEUTRAL[0]
              : HUMAN_ANIM.FACE_MOUTH_SMILE[0];
            human.randomize(human.seed);
            humans.push(human);

            const newBonus = createDynamic(undefined, bonusGroup, undefined, 'bonus', x, y, Bonus.GEMINI, BONUS_SIZE, BONUS_SIZE);
            human.holdingBonus = newBonus;
            newBonus.disableBody(true, false);
            newBonus.setAlpha(.5);
            newBonus.setDisplaySize(32, 32).refreshBody();
            newBonus.debugShowBody = false;

          }, 1000);
          break;
      }

      if (newPowerFrame === Bonus.RANDOM) {
        newgrounds.unlockMedal("Useless superpower");
        setTimeout(() => {
          this.getSurprised(200);
        }, 1000);
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
      ui.chat(message, this, this.trollBrain);
    }

    metAnotherHuman = 0;
    meetAnotherHuman(human: Human) {
      if (this.frozen) {
        return;
      }
      if (Date.now() - this.metAnotherHuman > 10000) {
        this.metAnotherHuman = Date.now();
        this.addHistory(human.frozen ? HumanEvent.MET_FREEZE : this.seed === human.seed ? HumanEvent.TWIN : HumanEvent.MEET_ANOTHER_HUMAN);
      }
    }

    destroy() {
      this.player.destroy(true);
      this.faceSprites.forEach(sprite => {
        sprite.destroy(true);
      });
      this.bodySprites.forEach(sprite => {
        sprite.destroy(true);
      });
    }
  }

  function randomSprite(
    seed: any,
    faceSprites: Phaser.GameObjects.Sprite[],
    bodySprites: Phaser.GameObjects.Sprite[],
    naked: any = false,
    invisible: any = false,
    forceMouth?: number) {

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
    // bodySprites[BodyEnum.PANTS].postFX.addColorMatrix().hue(rng() * 360);
    // bodySprites[BodyEnum.SKIRT].postFX.addColorMatrix().hue(rng() * 360);
    // bodySprites[BodyEnum.SHOES].postFX.addColorMatrix().hue(rng() * 360);
    // bodySprites[BodyEnum.SMALLSHOES].postFX.addColorMatrix().hue(rng() * 360);
    // bodySprites[BodyEnum.SHIRT].postFX.addColorMatrix().hue(rng() * 360);

    bodySprites[BodyEnum.PANTS].setTint(rng() * 0xffffff);
    bodySprites[BodyEnum.SKIRT].setTint(rng() * 0xffffff);
    bodySprites[BodyEnum.SHOES].setTint(rng() * 0xffffff);
    bodySprites[BodyEnum.SMALLSHOES].setTint(rng() * 0xffffff);
    bodySprites[BodyEnum.SHIRT].setTint(rng() * 0xffffff);


    bodySprites[BodyEnum.UNDERWEAR].setTint(Math.floor(rng() * 0xffffff) | 0x999999);
    const skinColor = Math.floor(rng() * 0xFFFFFF) | 0xaa9999;
    faceSprites[FaceEnum.SHAPE].setTint(skinColor);
    bodySprites[BodyEnum.BODY].setTint(skinColor);
    //    faceSprites[FaceEnum.HAT].setTint(Math.floor(rng() * 0xffffff));

    //  SHIRT
    bodySprites[BodyEnum.SHIRT].setVisible(rng() < .7 || !bodySprites[BodyEnum.PANTS].visible);

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
    faceSprites[FaceEnum.MOUTH].setFrame(rng() < .1 ? EMPTY_FACE_ENUM : 41 + Math.floor(rng() * 5));
    if (forceMouth !== undefined) {
      faceSprites[FaceEnum.MOUTH].setFrame(forceMouth);
    }
    faceSprites[FaceEnum.NOSE].setFrame(rng() < .1 ? EMPTY_FACE_ENUM : 46 + Math.floor(rng() * 5));
    faceSprites[FaceEnum.EYES].setFrame(51 + Math.floor(rng() * 5));
    faceSprites[FaceEnum.EYELASHES].setFrame(EMPTY_FACE_ENUM + Math.floor(rng() * 5));
    faceSprites[FaceEnum.GLASSES].setFrame(rng() < .7 ? EMPTY_FACE_ENUM : 76 + Math.floor(rng() * 5));
    faceSprites[FaceEnum.HAIR].setFrame(rng() < .1 ? EMPTY_FACE_ENUM : 61 + Math.floor(rng() * 5));
    faceSprites[FaceEnum.HAT].setFrame(rng() < .5 ? EMPTY_FACE_ENUM : 66 + Math.floor(rng() * 5));

    FACE_ACCESSORIES.forEach(accessory => {
      faceSprites[accessory].setVisible(rng() < .05);
    });
    faceSprites[FaceEnum.HEADPHONES_RIGHT].setVisible(faceSprites[FaceEnum.HEADPHONES_LEFT].visible);

    if (naked) {
      bodySprites[BodyEnum.PANTS].setVisible(false);
      bodySprites[BodyEnum.SKIRT].setVisible(false);
      bodySprites[BodyEnum.SHOES].setVisible(false);
      bodySprites[BodyEnum.SMALLSHOES].setVisible(false);
      bodySprites[BodyEnum.SHIRT].setVisible(false);
      faceSprites[FaceEnum.HAT].setVisible(false);

      FACE_ACCESSORIES.forEach(accessory => {
        faceSprites[accessory].setVisible(false);
      });
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
      const loader = this.load;
      loader
        .audio('main', u('assets/troll-song.mp3', blobs))
        .audio('main2', u('assets/a-nice-troll.mp3', blobs))
        .audio('power-troll', u('assets/power-troll.mp3', blobs))
        .audio('game-over', u('assets/game-over.mp3', blobs))
        .audio('repeat', u('assets/repeat.mp3', blobs))
        .audio('trumpet', u('assets/trumpet.mp3', blobs))
        .audio('darkness', u('assets/darkness.mp3', blobs));
      if (mapJson.theEnd) {
        loader.image('the-end', u('assets/the-end.png', blobs));
      }
      loader.image('santa', u('assets/santa.png', blobs));
    }
    create() {

      //  scoreText = this.add.text(16, 16, 'score: 0', { fontSize: '32px', color: '#fff' });
      if (level) {
        this.timerText = this.add.text(920, 6, '', {
          fontSize: '14pt', color: '#ddd',
          shadow: {
            color: "black",
            fill: true,
            offsetX: 1,
            offsetY: 1,
          },
        });
      }

      if (level) {
        this.music = this.sound.add(parseInt(level) % 2 === 1 ? 'main' : 'main2');
        this.music.loop = true;
        this.music.play();
        this.music.volume = !mapJson.locked ? .2 : 1;
      }

      if (canEditLevel) {
        createUIButton(this, UIButton.NewPlatform, "items", Icons.PLATFORM, "", "Add platform");
        createUIButton(this, UIButton.NewHuman, "items", Icons.HUMAN, "", "Add human");
        createUIButton(this, UIButton.NewKey, "items", Icons.KEY, "", "Add key");
        createUIButton(this, UIButton.NewDoor, "items", Icons.DOOR, "", "Add door");
        createUIButton(this, UIButton.NewRock, "rock", 0, "", "Add a rock");
        createUIButton(this, UIButton.NewWater, "water", Icons.WATER, "", "Add water");
        createUIButton(this, UIButton.NewPowerup, "bonus", 0, "", "Add powerup");
        createUIButton(this, UIButton.Duplicate, "items", Icons.DUPLICATE, "", "Copy element");
        createUIButton(this, UIButton.Trash, "items", Icons.TRASH, "url(cursor/trash-icon.cur), pointer", "Delete element");
        createUIButton(this, UIButton.Cancel, "items", Icons.CANCEL, "", "Cancel", true);
      }

      const mute = localStorage.getItem("mute") === "mute";
      game.sound.mute = mute;
      const muteButton = this.add.image(GAMEWIDTH - 110, GAMEHEIGHT - 20, "items", mute ? 53 : 52);
      muteButton.setDisplaySize(30, 30);
      muteButton.preFX?.addShadow();
      muteButton.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        const newMute = !game.sound.mute;
        game.sound.mute = newMute;
        localStorage.setItem("mute", newMute ? "mute" : "");
        muteButton.setFrame(newMute ? 53 : 52)
      }).on('pointerover', () => {
        muteButton.postFX.addGlow(0xffffff, 1);
      }).on('pointerout', () => {
        muteButton.postFX.clear();
      });
      muteButton.setVisible(!!level);


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

      this.powerIcon = this.add.image(20, GAMEHEIGHT - 20, 'sky').setDisplaySize(24, 24);
      this.powerIcon.setVisible(false);
      this.powerText = this.add.text(37, GAMEHEIGHT - 27, "", {
        fontSize: '18px', color: '#fff',
        shadow: {
          color: "black",
          fill: true,
          offsetX: 1,
          offsetY: 1,
        },
      });
      this.powerText.setVisible(false);

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
    chat(msg: string, human?: Human, troll?: Troll) {
      clearTimeout(this.chatTimeout);
      speechSynthesis.cancel();
      if (msg?.length) {
        const message = wrap(msg, {
          width: 30,
        });
        clearTimeout(this.tt);
        if (!this.chatText?.active) {
          return;
        }
        this.chatText?.setFontSize(human?.antMan ? 12 : 18);
        someoneSpeaking = Date.now();
        const rng = alea(human?.seed + "");
        this.chatText?.setText("");
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.volume = game.sound.mute ? 0 : !mapJson.locked ? 0.2 : 1;
        const voices = getVoices();
        utterance.voice = voices[Math.floor(rng() * voices.length)];
        console.log("VOICE", utterance.voice.name, utterance.voice.lang);
        if (!human?.lang && human) {
          human.lang = utterance.voice.lang;
        }
        human?.randomize(human.seed);
        const preFrame = human?.faceSprites[FaceEnum.MOUTH].frame.name ?? "";
        this.tt = setTimeout(() => {
          this.chatText?.setText(message);
        }, 1000);
        utterance.addEventListener("boundary", (e) => {
          clearTimeout(this.tt);
          if (this.chatText?.active) {
            this.chatText?.setText(message.slice(0, e.charIndex + e.charLength));
          }
          if (troll) {
            troll?.mouthSprites.forEach(sprite => sprite.setVisible(true));
          } else {
            if (human?.faceSprites[FaceEnum.MOUTH].active) {
              human?.faceSprites[FaceEnum.MOUTH].setFrame(
                preFrame != OPEN_MOUTH.toString()
                  ? OPEN_MOUTH
                  : HUMAN_ANIM.FACE_MOUTH[0] + Math.floor(Math.random() * (HUMAN_ANIM.FACE_MOUTH[1] - HUMAN_ANIM.FACE_MOUTH[0])),
              );
            }
          }
          setTimeout(() => {
            if (troll) {
              troll?.mouthSprites.forEach(sprite => sprite.setVisible(false));
            } else {
              if (human?.faceSprites[FaceEnum.MOUTH].active) {
                human?.faceSprites[FaceEnum.MOUTH].setFrame(preFrame);
              }
            }
          }, 200);
          this.tt = setTimeout(() => {
            if (this.chatText?.active) {
              this.chatText?.setText(message);
            }
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

        if (troll) {
          this.chatText?.setPosition(troll.player.x, troll.player.y);
        } else {
          this.chatText?.setPosition(human?.player.x ?? 0, human?.player.y);
        }
        this.chatText?.setVisible(true);
        this.chatFollow = troll?.player ?? human?.player
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
      const newTimeStr = "Time: " + ((endTime - this.startTime) / 1000).toFixed(gameOver || victory ? 2 : 0);
      if (newTimeStr !== this.timeStr) {
        this.timeStr = newTimeStr;
        this.timerText?.setText(newTimeStr + (canEditLevel ? "\nfps: " + game.loop.actualFps.toFixed(2) : ""));
        this.timerText?.setX(GAMEWIDTH - this.timerText.width - 10);
      }

      // if (game.loop.actualFps < 35) {
      //   if (!this.warningTime) {
      //     this.warningTime = Date.now();
      //   }
      //   if (Date.now() - this.warningTime < 20000) {
      //     if (!this.warningText?.visible) {
      //       this.warningText?.setVisible(true);
      //       humans.forEach(human => human.addHistory(HumanEvent.LOW_BATTERY));
      //     }
      //     const newFPSText = `Warning: The game has issues when running at low frame rate (${game.loop.actualFps.toFixed(1)} fps).\nThis could happen if your computer is low on battery.`;
      //     this.warningText?.setText(newFPSText);
      //   } else {
      //     this.warningText?.setVisible(false);
      //   }
      // } else {
      //   if (this.warningText?.visible) {
      //     this.warningText?.setVisible(false);
      //     humans.forEach(human => human.addHistory(HumanEvent.NORMAL_BATTERY));
      //     this.warningTime = 0;
      //   }
      // }
      if (this.chatFollow) {
        this.chatText?.setPosition(Math.min(GAMEWIDTH - this.chatText.width, Math.max(0, this.chatFollow.x - this.chatText.width / 2)), Math.max(30, this.chatFollow.y - 50 - this.chatText.height));
      }
      if (Phaser.Input.Keyboard.JustDown((cursors as any).r)) {
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
      onStartCallbacks.add(() => document.removeEventListener("keydown", onKey));
    }

    stopAll() {
      this.music?.stop();
      this.endTime = Date.now();
      speechSynthesis.cancel();
    }

    keyToRestart(goNextLevel: boolean = false) {
      const onRestart = (e: KeyboardEvent) => {
        if (e.code === "Space" || e.code === "Enter") {
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
      onStartCallbacks.add(() => document.removeEventListener("keydown", onRestart));
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
          this.add.text(250, 300, 'press space to continue', { fontSize: '32px', color: '#fff' });
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
        setTimeout(() => {
          nextLevel();
        }, 500);
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
        if (mapJson.theEnd) {
          this.theEnd();
        }
        setTimeout(() => {
          if (!mapJson.theEnd) {
            this.add.text(250, 300, 'press space to continue', { fontSize: '32px', color: '#fff' });
            this.keyToRestart(true);
          }

          if (mapJson.theEnd) {
            setTimeout(() => {
              newgrounds.unlockMedal("Beat the game!");
            }, 3000);
          }
          newgrounds.unlockMedal("Level " + level);
          newgrounds.postScore((this.endTime ?? Date.now()) - this.startTime, "Level " + (parseInt(level) < 10 ? " " : "") + level);


          loopy.play();
        }, 1000);
        try {
          this.add.text(250, 200, 'POWER TROLL!', { fontSize: '64px', color: '#0f0' })
            .setShadow(5, 5, 'rgba(0,0,0,0.5)', 15)
            .postFX.addGlow();
        } catch (e) {
          console.warn("Warning:", e);
        }

        sound.play();
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

  function makeBonusChangeTriangle(scene: Phaser.Scene, bonus: any, id?: string) {
    if (!bonus) {
      return;
    }
    const t = (bonus as any).triangle = scene.add.triangle((bonus as any).indic.x, (bonus as any).indic.y, 0, 0, 12, 16, 0, 32, 0xFFaa00);
    const t2 = (bonus as any).triangle_back = scene.add.triangle((bonus as any).indic.x, (bonus as any).indic.y, 12, 0, 0, 16, 12, 32, 0xFFaa00);
    const tt = [t, t2];
    tt.forEach((t, index) => {
      t.setInteractive({ useHandCursor: true });
      t.on('pointerover', () => {
        t.setFillStyle(0xFFee00);
      });
      t.on('pointerout', () => {
        t.setFillStyle(0xFFaa00);
        ui?.showPower();
      });
      t.on('pointerdown', () => {
        const frame = (parseInt((bonus as any).frame.name) + (index === 0 ? 1 : -1) + BONUS_COUNT) % BONUS_COUNT;
        (bonus as any).setFrame(frame);
        (bonus as any).indic.setFrame(frame);
        powerUpButton?.setFrame(frame);
        ui?.showPower(POWER_DESC[parseInt(bonus.frame.name) as Bonus], bonus);

        const p = (bonus as any);
        if (id) {
          commit("bonus", id, p.x, p.y, p.displayWidth, p.displayHeight, parseInt(p.frame.name),
            {
              label: p.label,
              lockedByLevel: p.lockedByLevel,
              nextLevel: p.nextLevel,
              trigger: p.trigger,
              horizontal: p.horizontal,
            });
        }
      });
    });
  }

  async function commit(type: string, id: string, x: number, y: number, width: number, height: number, frame?: number,
    extra?: any,
  ) {
    if (serverLessEdit) {
      console.log("no server to commit", type, id, x, y, width, height, frame, extra)
      return;
    }
    console.log("COMMIT", type, id, x, y, width, height, frame, extra);
    if (saveUrl) {
      await fetch(saveUrl, {
        method: "POST",
        body: JSON.stringify({
          jsonUrl,
          type,
          id,
          deleted: extra?.deleted,
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

  function getUiCursor(hovering?: boolean) {
    return uiIndex < 0 ? undefined : cursorsPerUi[uiIndex]?.[hovering ? 1 : 0];
  }

  function movePlatform(key: string, id: string, platform: Phaser.Physics.Arcade.Image,
    { leftEdge, rightEdge, topEdge, bottomEdge }: { leftEdge?: boolean, rightEdge?: boolean, topEdge?: boolean, bottomEdge?: boolean },
    rect?: Phaser.GameObjects.Rectangle,
    doneMoving?: (didMove: boolean) => void,
    forceDidMove?: boolean
  ) {
    const posX = platform.x;
    const posY = platform.y;
    const preX = platform.scene.input.mousePointer.x;
    const preY = platform.scene.input.mousePointer.y;
    const platformW = platform.displayWidth;
    const platformH = platform.displayHeight;
    let didMove = !!forceDidMove;
    const onMove = (e: MouseEvent) => {
      didMove = true;
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
          const left = leftEdge ? (posX - platformW / 2 + dx) : (posX - platformW / 2);
          const right = rightEdge ? (posX + platformW / 2 + dx) : (posX + platformW / 2);
          const top = topEdge ? (posY - platformH / 2 + dy) : (posY - platformH / 2);
          const bottom = bottomEdge ? (posY + platformH / 2 + dy) : (posY + platformH / 2);
          platform.setDisplaySize(right - left, bottom - top)
            .setPosition((right + left) / 2, (top + bottom) / 2)
            .refreshBody();
          if (rect?.active) {
            rect?.setPosition(platform.x, platform.y);
            rect?.setSize(platform.displayWidth, platform.displayHeight);
          }
        }
      }
    };
    document.addEventListener("mousemove", onMove);
    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMove);
      const p = (platform as any);
      if (didMove) {
        commit(key, id, platform.x, platform.y, platform.displayWidth, platform.displayHeight, parseInt(platform.frame.name),
          {
            label: p.label,
            lockedByLevel: p.lockedByLevel,
            nextLevel: p.nextLevel,
            trigger: p.trigger,
            horizontal: p.horizontal,
          });
      }
      doneMoving?.(didMove);
    };
    document.addEventListener("mouseup", onMouseUp, { once: true });
    onStartCallbacks.add(() => document.removeEventListener("mousemove", onMove));
    onStartCallbacks.add(() => document.removeEventListener("mouseup", onMouseUp));
  }

  function createVanishEffect(scene: Phaser.Scene, x: number, y: number) {
    const item = scene.add.sprite(x, y, "vanish");
    item.play("vanish");
  }

  function createDynamic(
    indicators: Phaser.Physics.Arcade.StaticGroup | undefined,
    platforms: Phaser.Physics.Arcade.Group | undefined,
    id: string | undefined,
    key: string,
    x: number, y: number,
    frame?: number | string,
    width?: number, height?: number,
    subject?: Phaser.GameObjects.Image,
    options: {
      indicKey?: string;
      canDelete?: (t: any) => boolean;
      canCopy?: () => boolean;
      onDelete?: (gameObject?: Phaser.GameObjects.GameObject, indic?: Phaser.GameObjects.GameObject) => void;
      onCopy?: (result?: Phaser.GameObjects.GameObject, id?: string) => void;
      onCreate?: (oldIndic?: Phaser.GameObjects.GameObject, id?: string) => any;
    } = {}
  ) {
    if (id) {
      idSet.add(id);
    }
    const platform: Phaser.Physics.Arcade.Image | undefined = platforms?.create(x, y, key, frame);
    const indic = indicators?.create(x, y, options.indicKey ?? key, frame);
    if (indic) {
      (indic as any).subject = subject;
    }
    if (platform) {
      (platform as any).indic = indic;
    }
    indic?.setAlpha(.3);
    if (width && height) {
      platform?.setDisplaySize(width, height);
      indic?.setDisplaySize(width, height);
    }

    if (canEditLevel && indic) {
      let startedMoving = false;
      indic.on('pointermove', (pointer: any, localX: number, localY: number, event: any) => {
        const moveOrPointer = selectedElement !== indic ? "pointer" : "move";
        const cursor = getUiCursor(true) ?? (startedMoving ? "grab" : moveOrPointer);
        indic.scene.input.setDefaultCursor(cursor);
      });

      let rect: Phaser.GameObjects.Rectangle | undefined;
      function setSelected(indic?: Phaser.GameObjects.Image) {
        if (selectedElement && indic !== selectedElement) {
          rect?.destroy(true);
          rect = undefined;
          onDeselect = undefined;
          onDeleteSelected = undefined;
          selectedElement = undefined;
        }
        if (indic) {
          const scene: Phaser.Scene = indic.scene;
          rect = scene.add.rectangle(indic.x, indic.y, indic.displayWidth, indic.displayHeight);
          rect.setStrokeStyle(4, 0xefc53f);
          onDeselect = () => setSelected(undefined);
          onDeleteSelected = options.canDelete && !options.canDelete?.(indic) ? undefined : () => {
            indic?.destroy(true);
            platform?.destroy(true);
            options?.onDelete?.(platform, indic);
            if (id) {
              commit(key, id, 0, 0, 0, 0, undefined, {
                deleted: true
              });
              idSet.delete(id);
            }
          };
          selectedElement = indic;
        } else {
          rect?.destroy(true);
          rect = undefined;
          onDeselect = undefined;
          onDeleteSelected = undefined;
          selectedElement = undefined;
        }
      }

      indic.on('pointerdown', (pointer: any, localX: number, localY: number, event: Event) => {
        if (startedMoving) {
          return;
        }
        onDeselect?.();
        setSelected(indic);
        startedMoving = true;
        if (uiIndex === UIButton.Trash) {
          onDeleteSelected?.();
          setUiIndex(-1);
          startedMoving = false;
          rect?.destroy();
        } else if ((cursors?.shift.isDown || uiIndex === UIButton.Duplicate) && (!options.canCopy || options.canCopy())) {
          let id = key;
          for (let i = 1; i < 100000; i++) {
            if (!idSet.has(key + i)) {
              id = key + i;
              break;
            }
          }
          if (platforms) {
            const p: Phaser.Physics.Arcade.Image | undefined = createDynamic(indicators, platforms, id, key, indic.x, indic.y, frame, width, height, undefined, options);
            if (p) {
              setSelected(p);
              movePlatform(key, id, (p as any).indic, {
                leftEdge: false, rightEdge: false, topEdge: false, bottomEdge: false,
              }, rect, (didMove: boolean) => {
                if (didMove) {
                  p.setPosition((p as any).indic.x, (p as any).indic.y);
                }
                startedMoving = false;
              });
              options.onCopy?.(p, id);
            }
          } else if (options.onCreate) {
            const p: any = options.onCreate?.(indic, id);
            movePlatform(key, id, p.indic, {
              leftEdge: false, rightEdge: false, topEdge: false, bottomEdge: false,
            }, rect, (didMove: boolean) => {
              if (didMove) {
                p.setPosition((p as any).indic.x, (p as any).indic.y);
              }
              startedMoving = false;
            });
          }
        } else if (id) {
          movePlatform(key, id, indic, {
            leftEdge: false, rightEdge: false, topEdge: false, bottomEdge: false,
          }, rect, (didMove: boolean) => {
            if (didMove) {
              platform?.setPosition(indic.x, indic.y);
              if ((subject as any)?.human) {
                (subject as any).human.dx = 0;
                (subject as any).human.born = Date.now();
                subject?.body?.gameObject.setVelocityX(0);
              }
              subject?.setPosition(indic.x, indic.y);
            }
            startedMoving = false;
          });
        }
      });

      indic.setInteractive().on('pointerover', function (pointer: any, localX: any, localY: any, event: any) {
        indic.postFX.addGlow(0xffffff, 1);

        indic.once('pointerout', function (pointer: any, localX: any, localY: any, event: any) {
          indic.postFX.clear();
          indic.scene.input.setDefaultCursor(getUiCursor() ?? "auto");
        });
      });
    } else {
      indic?.setVisible(false);
    }

    return platform ?? indic;
  }

  //  size 400,32
  function createPlatform(platforms: Phaser.Physics.Arcade.StaticGroup,
    id: string,
    key: string,
    x: number, y: number,
    width?: number, height?: number,
    options: {
      noResize?: boolean;
      onCopy?: (result?: Phaser.GameObjects.GameObject, id?: string) => void;
    } = {}
  ) {
    idSet.add(id);
    const platform: Phaser.Physics.Arcade.Image = platforms.create(x, y, key);
    if (width && height) {
      platform.setSize(width, height).refreshBody();
      platform.setDisplaySize(width, height).refreshBody();
    }
    function edges(localX: number, localY: number, noResize?: boolean) {
      const leftEdge = !noResize && localX < 5 / platform.scaleX;
      const rightEdge = !noResize && localX > (platform.width) - 5 / platform.scaleX;
      const topEdge = !noResize && localY < 5 / platform.scaleY;
      const bottomEdge = !noResize && localY > (platform.height) - 5 / platform.scaleY;
      return { leftEdge, rightEdge, topEdge, bottomEdge };
    }

    if (canEditLevel) {
      let startedMoving = false;
      function updateSelection(localX: number, localY: number) {
        const { leftEdge, rightEdge, topEdge, bottomEdge } = edges(localX, localY, options.noResize);
        const moveOrPointer = selectedElement !== platform ? "pointer" : "move";
        const cursor = startedMoving && (!leftEdge && !rightEdge && !topEdge && !bottomEdge)
          ? "grab"
          : options.noResize ? moveOrPointer : leftEdge && topEdge || rightEdge && bottomEdge
            ? "nwse-resize"
            : rightEdge && topEdge || leftEdge && bottomEdge
              ? "nesw-resize"
              : leftEdge || rightEdge
                ? "ew-resize"
                : topEdge || bottomEdge
                  ? "ns-resize"
                  : moveOrPointer;

        platform.scene.input.setDefaultCursor(getUiCursor(true) ?? cursor);
      }
      platform.on('pointermove', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: any) => {
        updateSelection(localX, localY);
      });

      let rect: Phaser.GameObjects.Rectangle | undefined;
      function setSelected(selection?: Phaser.GameObjects.Image) {
        if (selectedElement && selection !== selectedElement) {
          rect?.destroy(true);
          rect = undefined;
          onDeselect = undefined;
          onDeleteSelected = undefined;
          selectedElement = undefined;
        }
        if (selection) {
          const scene: Phaser.Scene = selection.scene;
          rect = scene.add.rectangle(selection.x, selection.y, selection.displayWidth, selection.displayHeight);
          rect.setStrokeStyle(4, 0xefc53f);
          onDeselect = () => setSelected();
          onDeleteSelected = () => {
            commit(key, id, 0, 0, 0, 0, undefined, {
              deleted: true
            });
            idSet.delete(id);
            selection.destroy(true);
          };
          selectedElement = selection;
          scene.children.bringToTop(selectedElement);
        } else {
          rect?.destroy(true);
          rect = undefined;
          onDeselect = undefined;
          onDeleteSelected = undefined;
          selectedElement = undefined;
        }
      }
      platform.on('pointerdown', (pointer: any, localX: number, localY: number, event: Event) => {
        if (startedMoving) {
          return;
        }
        onDeselect?.();
        setSelected(platform);
        updateSelection(localX, localY);
        startedMoving = true;
        if (uiIndex === UIButton.Trash) {
          onDeleteSelected?.();
          startedMoving = false;
          rect?.destroy();
          setUiIndex(-1);
        } else {
          const { leftEdge, rightEdge, topEdge, bottomEdge } = edges(localX, localY, options.noResize);
          let p = platform;
          if (cursors?.shift.isDown || uiIndex === UIButton.Duplicate) {
            setUiIndex(UIButton.Duplicate);
            let id = key;
            for (let i = 1; i < 100000; i++) {
              if (!idSet.has(key + i)) {
                id = key + i;
                break;
              }
            }
            const shiftCreation = uiIndex === UIButton.Duplicate ? 10 : 0;
            const p: Phaser.Physics.Arcade.Image = createPlatform(platforms, id, key, platform.x + shiftCreation, platform.y - shiftCreation, platform.displayWidth, platform.displayHeight, options);
            setSelected(p);
            movePlatform(key, id, p, {
              leftEdge: false, rightEdge: false, topEdge: false, bottomEdge: false,
            }, rect, () => {
              startedMoving = false;
              setUiIndex(-1);
            });
            options.onCopy?.(p, id);
          } else {
            movePlatform(key, id, p, {
              leftEdge, rightEdge, topEdge, bottomEdge,
            }, rect, () => startedMoving = false);
          }
        }
      });

      platform.setInteractive().on('pointerover', function (pointer: any, localX: any, localY: any, event: any) {
        platform.postFX.addGlow(0xffffff, 1);
        platform.once('pointerout', function (pointer: any, localX: any, localY: any, event: any) {
          platform.postFX.clear();
          platform.scene.input.setDefaultCursor(getUiCursor() ?? "auto");
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
  // let trollo: Troll;
  const trolls: Troll[] = [];
  let sky: Phaser.GameObjects.Image;
  let bonusGroup: Phaser.Physics.Arcade.Group;
  let keyGroup: Phaser.Physics.Arcade.Group;
  let doorGroup: Phaser.Physics.Arcade.StaticGroup;
  let rocks: Phaser.Physics.Arcade.Group;
  let humanGroup: Phaser.Physics.Arcade.Group;
  let waterGroup: Phaser.Physics.Arcade.StaticGroup;
  let buttonGroup: Phaser.Physics.Arcade.StaticGroup;
  let gateGroup: Phaser.Physics.Arcade.StaticGroup;
  let platforms: Phaser.Physics.Arcade.StaticGroup;
  let indicators: Phaser.Physics.Arcade.StaticGroup;
  const triggerItems: Record<string, () => void> = {};
  const bonuses: any[] = [];
  let ghostPlatform: Phaser.GameObjects.Image | undefined;

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
        debug: !mapJson.locked,
        fps: 60,
        debugShowStaticBody: false,
      },
    },
    scene: [{
      preload() {
        {
          const loader = this.load;
          loader.image('sky', u('assets/sky.png', blobs))
            .image('ground', u('assets/platform.png', blobs))
            .image('trigger', u('assets/trigger.png', blobs))
            .image('star', u('assets/star.png', blobs))
            .image('bomb', u('assets/bomb.png', blobs))
            .spritesheet('bonus', u('assets/bonus.png', blobs), {
              frameWidth: 32, frameHeight: 32,
            })
            .spritesheet('hi',
              u('assets/hischooler.png', blobs),
              { frameWidth: 68, frameHeight: 68 }
            )
            .spritesheet('troll',
              u('assets/troll.png', blobs),
              { frameWidth: 32, frameHeight: 32 }
            )
            .spritesheet("rock",
              u('assets/rock.png', blobs),
              { frameWidth: 64, frameHeight: 64 },
            )
            .spritesheet("water",
              u('assets/items.png', blobs),
              { frameWidth: 64, frameHeight: 64 },
            )
            .spritesheet("key",
              u('assets/items.png', blobs),
              { frameWidth: 64, frameHeight: 64 },
            )
            .spritesheet("door",
              u('assets/items.png', blobs),
              { frameWidth: 64, frameHeight: 64 },
            )
            .spritesheet("sfx",
              u('assets/sfx.png', blobs),
              { frameWidth: 64, frameHeight: 64 },
            )
            .spritesheet("items",
              u('assets/items.png', blobs),
              { frameWidth: 64, frameHeight: 64 },
            )
            .image('mountain', u('assets/mountainbg.png', blobs));
          if (mapJson.overlay) {
            loader.image('overlay', u(mapJson.overlay, blobs));
          }
        }
      },
      create() {
        //        this.physics.world.drawDebug = false;

        gameScene = this.scene;

        this.scene.launch('UIScene');

        this.scene.setVisible(false);
        visTime = Date.now() + 500;


        if (mapJson.overlay) {
          const overlay = ui.add.image(GAMEWIDTH / 2, GAMEHEIGHT / 2, 'overlay').setDisplaySize(GAMEWIDTH, GAMEHEIGHT);
          overlay.preFX?.addShadow(0, 0, .1, .3, 0, 12, .3);
          if (canEditLevel) {
            overlay.setAlpha(.5);
          }
        }


        if (level) {
          sky = this.add.image(GAMEWIDTH / 2, GAMEHEIGHT / 2, 'sky').setDisplaySize(GAMEWIDTH, GAMEHEIGHT);
          sky.setTint(0xffffff, 0xccffff, 0xcc66ff * Math.random() | 0x666699, 0xff44cc * Math.random() | 0x884488);
          sky.preFX?.addBlur(2);  //  high quality blur
          if (canEditLevel) {
            sky.setInteractive().on("pointerdown", () => onDeselect?.());
          }

          (window as any).sky = sky;
          const mount = this.add.image(GAMEWIDTH / 2, GAMEHEIGHT / 2, 'mountain').setDisplaySize(GAMEWIDTH, GAMEHEIGHT)
            .setAlpha(.4);
          mount.preFX?.addBlur(2);  //  high quality blur
        }


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
          frames: this.anims.generateFrameNumbers('items', { start: 4, end: 12 }),
          frameRate: 20,
        });
        this.anims.create({
          key: `door_close`,
          frames: this.anims.generateFrameNumbers('items', { start: 13, end: 16 }),
          frameRate: 20,
        });
        this.anims.create({
          key: `water`,
          frames: this.anims.generateFrameNumbers('items', { start: 17, end: 23 }),
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
          frames: this.anims.generateFrameNumbers('items', { start: 24, end: 26 }),
          frameRate: 10,
        });
        this.anims.create({
          key: `button_up`,
          frames: this.anims.generateFrameNumbers('items', { frames: [26, 25, 24] }),
          frameRate: 10,
        });
        this.anims.create({
          key: `gate_down`,
          frames: this.anims.generateFrameNumbers('items', { start: 27, end: 33 }),
          frameRate: 25,
        });
        this.anims.create({
          key: `gate_up`,
          frames: this.anims.generateFrameNumbers('items', { frames: [32, 31, 30, 29, 28, 27] }),
          frameRate: 25,
        });
        this.anims.create({
          key: `hgate_open`,
          frames: this.anims.generateFrameNumbers('items', { start: 34, end: 40 }),
          frameRate: 25,
        });
        this.anims.create({
          key: `hgate_close`,
          frames: this.anims.generateFrameNumbers('items', { frames: [40, 39, 38, 37, 36, 35, 34] }),
          frameRate: 25,
        });
        this.anims.create({
          key: `yellow_arrow`,
          frames: this.anims.generateFrameNumbers('items', { frames: [44, 45, 46, 45] }),
          frameRate: 10,
          repeat: -1,
        });

        platforms = this.physics.add.staticGroup();
        indicators = this.physics.add.staticGroup();


        Object.entries(mapJson.ground ?? {}).forEach(([id, params]) => {
          if (!Array.isArray(params)) {
            const { x, y, width, height, frame, lockedByLevel } = params;
            if (lockedByLevel && !unlockedLevel(lockedByLevel) && !canEditLevel) {
              return;
            }
            const p = createPlatform(platforms, id, 'ground', x, y, width, height, {
              onCopy: (p, id) => {
                (p as any).preFX?.addGlow(0x000000, 0, 1, false);
              },
            });
            (p as any).lockedByLevel = lockedByLevel;
            if (level && !canEditLevel) {
              p.setAlpha(.3);
            } else {
              p.preFX?.addGlow(0x000000, 0, 1, false);
            }
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
          //console.log(x, y, lockedByLevel, label, nextLevel);
          if (lockedByLevel && !unlockedLevel(lockedByLevel) && !canEditLevel) {
            return;
          }
          const d = createPlatform(doorGroup, id, 'door', x, y, undefined, undefined, {
            noResize: true,
          });
          d.setBodySize(40, 64);
          (d as any).anims.play("door");

          if (label) {
            const labelText = ui.add.text(x, y, label, {
              fontSize: '16pt', color: '#fff',
              shadow: {
                color: "black",
                fill: true,
                offsetX: 1,
                offsetY: 1,
              },
            });
            (d as any).labelText = labelText;
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

        const trollGroup = this.physics.add.group({
          collideWorldBounds: true,
          allowGravity: true,
          bounceY: .2,
          bounceX: .2,
          allowDrag: true,
          useDamping: true,
        });
        Object.entries(mapJson.troll ?? {}).forEach(([id, params]) => {
          const { x, y } = params;
          const hue = trolls.length === 0 ? 0 : -100;
          const troll = new Troll(this, x, y, trollGroup, hue, trolls.length === 0 ? 1 : 2);
          troll.setScale(1.5, 1.5, TROLL_DISPLAY_SCALE, TROLL_DISPLAY_SCALE);
          const indicOptions = {
            canDelete(indic: any) {
              return trolls.length > 1 && trolls.indexOf(indic.troll) === 1;
            },
            onDelete(_: any, indic: any) {
              const troll = indic.troll;
              const index = trolls.findIndex(t => t === troll);
              if (index >= 0) {
                trolls.splice(index, 1);
                troll.destroy();
              }
            },
            canCopy() {
              return trolls.length < 2;
            },
            onCreate: (oldIndic: any, id?: string) => {
              const hue = -100;
              const troll = new Troll(this, oldIndic.x, oldIndic.y, trollGroup, -100, trolls.length === 0 ? 1 : 2);
              troll.setScale(1.5, 1.5, TROLL_DISPLAY_SCALE, TROLL_DISPLAY_SCALE);
              const indic = createDynamic(indicators, undefined, id, "troll", x, y, undefined, 48, 48, troll.player, indicOptions);
              indic?.preFX?.addColorMatrix().hue(hue);
              (indic as any).troll = troll;
              trolls.push(troll);
              (troll.player as any).indic = indic;
              return troll.player;
            }
          };
          const indic = createDynamic(indicators, undefined, id, "troll", x, y, undefined, 48, 48, troll.player, indicOptions);
          indic?.preFX?.addColorMatrix().hue(hue);
          (indic as any).troll = troll;
          trolls.push(troll);
        });
        if (!trolls.length) {
          const troll = new Troll(this, 200, 300, trollGroup);
          troll.setScale(1.5, 1.5, TROLL_DISPLAY_SCALE, TROLL_DISPLAY_SCALE);
          trolls.push(troll);
        }

        humanGroup = this.physics.add.group();
        Object.entries(mapJson.human ?? {}).forEach(([id, params]) => {
          const { x, y } = params;
          const human = new Human(this, x, y, humanGroup);
          if (canEditLevel) {
            const indicOptions = {
              indicKey: "items",
              onDelete(_: any, indic: any) {
                const human = indic.human;
                human.destroy();
                const index = humans.findIndex(h => h === human);
                humans.splice(index, 1);
              },
              onCreate: (oldIndic: any, id?: string) => {
                const { x, y } = oldIndic;
                const human = new Human(this, x, y, humanGroup);
                const indic = createDynamic(indicators, undefined, id, "human", x, y, 54, undefined, undefined, human.player, indicOptions);
                (indic as any).human = human;
                (human.player as any).indic = indic;
                humans.push(human);
                return human.player;
              },
            };
            const indic = createDynamic(indicators, undefined, id, "human", x, y, 54, undefined, undefined, human.player, indicOptions);
            (human as any).indic = indic;
            (indic as any).human = human;
          }
          humans.push(human);
        });

        this.physics.add.collider(humanGroup, platforms);
        this.physics.add.collider(humanGroup, humanGroup, (human1: any, human2: any) => {
          human1.human.meetAnotherHuman(human2.human);
          human2.human.meetAnotherHuman(human1.human);
          if (Math.random() < .5) {
            human1.human.speakAI();
          } else {
            human2.human.speakAI();
          }
          if (human1.human.frozen) {
          } else {
            if (human2.human.getHeldBonus() === Bonus.FREEZE) {
              human2.human.freeze(human1.human);
            }
          }
          if (human2.human.frozen) {
          } else {
            if (human1.human.getHeldBonus() === Bonus.FREEZE) {
              human1.human.freeze(human2.human);
            }
          }
        });

        this.physics.add.overlap(humanGroup, humanGroup, (human1: any, human2: any) => {
          human1.human.meetAnotherHuman(human2.human);
          human2.human.meetAnotherHuman(human1.human);
          if (human1.human.frozen) {
          } else {
            if (human2.human.getHeldBonus() === Bonus.FREEZE) {
              human2.human.freeze(human1.human);
            }
          }
          if (human2.human.frozen) {
          } else {
            if (human1.human.getHeldBonus() === Bonus.FREEZE) {
              human1.human.freeze(human2.human);
            }
          }
        });

        const trollAnimation = {
          still: this.anims.create({
            key: `troll_still`,
            frames: this.anims.generateFrameNumbers('troll', { start: 0, end: 0 }),
            frameRate: 20,
          }),
          crouch: this.anims.create({
            key: `troll_crouch`,
            frames: this.anims.generateFrameNumbers('troll', { frames: [38, 39] }),
            frameRate: 10,
          }),
          crouch_walk: this.anims.create({
            key: `troll_crouch_walk`,
            frames: this.anims.generateFrameNumbers('troll', { frames: [39, 40] }),
            frameRate: 10,
            repeat: -1,
          }),
          hold_crouch: this.anims.create({
            key: `troll_hold_crouch`,
            frames: this.anims.generateFrameNumbers('troll', { frames: [41, 41] }),
            frameRate: 10,
          }),
          hold_crouch_walk: this.anims.create({
            key: `troll_hold_crouch_walk`,
            frames: this.anims.generateFrameNumbers('troll', { frames: [41, 42] }),
            frameRate: 10,
            repeat: -1,
          }),
          talk_still: this.anims.create({
            key: `troll_talk_still`,
            frames: this.anims.generateFrameNumbers('troll', { start: 31, end: 31 }),
            frameRate: 20,
          }),
          walk: this.anims.create({
            key: `troll_walk`,
            frames: this.anims.generateFrameNumbers('troll', { start: 2, end: 7 }),
            frameRate: 20,
            repeat: -1,
          }),
          talk_walk: this.anims.create({
            key: `troll_talk_walk`,
            frames: this.anims.generateFrameNumbers('troll', { start: 32, end: 37 }),
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
          jump: this.anims.create({
            key: `troll_jump`,
            frames: this.anims.generateFrameNumbers('troll', { start: 19, end: 23 }),
            frameRate: 30,
          }),
          air: this.anims.create({
            key: `troll_air`,
            frames: this.anims.generateFrameNumbers('troll', { start: 23, end: 23 }),
            frameRate: 30,
          }),
          land: this.anims.create({
            key: `troll_land`,
            frames: this.anims.generateFrameNumbers('troll', { start: 24, end: 24 }),
            frameRate: 30,
          }),
          landed: this.anims.create({
            key: `troll_landed`,
            frames: this.anims.generateFrameNumbers('troll', { frames: [22, 19, 20, 21, 21, 21, 20, 19, 0] }),
            frameRate: 10,
          }),
          jump_hold: this.anims.create({
            key: `troll_hold_jump`,
            frames: this.anims.generateFrameNumbers('troll', { start: 25, end: 29 }),
            frameRate: 30,
          }),
          air_hold: this.anims.create({
            key: `troll_hold_air`,
            frames: this.anims.generateFrameNumbers('troll', { start: 29, end: 29 }),
            frameRate: 30,
          }),
          land_hold: this.anims.create({
            key: `troll_hold_land`,
            frames: this.anims.generateFrameNumbers('troll', { start: 30, end: 30 }),
            frameRate: 30,
          }),
          landed_hold: this.anims.create({
            key: `troll_hold_landed`,
            frames: this.anims.generateFrameNumbers('troll', { frames: [28, 25, 26, 27, 27, 27, 26, 25, 12] }),
            frameRate: 10,
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

        this.physics.add.collider(trollGroup, platforms, (player, platform) => {
          const p = (player as Phaser.Types.Physics.Arcade.GameObjectWithBody);
          const troll = (p as any).troll;
          if (p.body.touching.down) {
            if (!troll.onPlatform) {
              troll.onPlatform = platform as Phaser.Types.Physics.Arcade.GameObjectWithBody;
            }
          } else if (p.body.touching.up) {
            zzfx(...[1.99, , 37, , .01, 0, 1, 1.53, , -76, , , , , , , .25, , .02]); // Blip 559
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
          e: Phaser.Input.Keyboard.KeyCodes.E,
          f: Phaser.Input.Keyboard.KeyCodes.F,
          shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
          r: Phaser.Input.Keyboard.KeyCodes.R,
          delete: Phaser.Input.Keyboard.KeyCodes.BACKSPACE,
          esc: Phaser.Input.Keyboard.KeyCodes.ESC,
          enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
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
          const object = createDynamic(indicators, rocks, id, 'rock', x, y, frame, undefined, undefined, undefined, {
            onCopy: (result: any, id) => {
              result.body?.gameObject?.setPushable(false);
              result.body?.gameObject?.setDamping(true);
              result.body?.gameObject?.setDrag(.01);
              result.body?.gameObject?.setCollideWorldBounds(true);
              (result as any).indic.rock = result;
            },
          });
          object.body?.gameObject?.setPushable(false);
          object.body?.gameObject?.setDamping(true);
          object.body?.gameObject?.setDrag(.01);
          object.body?.gameObject?.setCollideWorldBounds(true);
          (object as any).indic.rock = object;
        });

        waterGroup = this.physics.add.staticGroup();
        Object.entries(mapJson.water ?? {}).forEach(([id, params]) => {
          const { x, y, width, height } = params;
          const b = createPlatform(waterGroup, id, 'water', x, y, width, height, {
            onCopy: (b, id) => {
              (b as any).anims.play({ key: 'water', randomFrame: true });
              (b as any).setBodySize(width, height / 3);
            },
          });
          if (b) {
            (b as any).anims.play({ key: 'water', randomFrame: true });
            (b as any).setBodySize(width, height / 3);
          }
        });


        this.physics.add.collider(rocks, keyGroup);
        this.physics.add.collider(rocks, rocks);
        this.physics.add.collider(rocks, platforms);
        this.physics.add.collider(rocks, humanGroup, (rock, human) => {
          const humanObj = (human as any).human;
          const bonus = humanObj.holdingBonus;
          if (bonus?.frame && parseInt(bonus?.frame.name) === Bonus.STRENGTH) {
            if (humanObj.player.body.touching.left || humanObj.player.body.touching.right) {
              if (!(rock as any).pushable) {
                if (!humanObj.firstTimePush) {
                  humanObj.firstTimePush = Date.now();
                  setTimeout(() => {
                    humanObj.getSurprised();
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
          }
        });
        this.physics.add.collider(trollGroup, rocks, (player, rock) => {
          const p = (player as Phaser.Types.Physics.Arcade.GameObjectWithBody);
          const troll = (p as any).troll as Troll;
          if (p.body.touching.down) {
            if (!troll.onPlatform) {
              troll.onPlatform = rock as Phaser.Types.Physics.Arcade.GameObjectWithBody;
            }
          }
        });

        Object.entries(mapJson.trigger ?? {}).forEach(([id, params]) => {
          if (!Array.isArray(params)) {
            const { x, y, width, height, frame } = params;
            const p = createPlatform(triggers, id, 'trigger', x, y, width, height);
            p.setAlpha(mapJson.locked ? .5 : 1);
            return;
          }
          const [x, y, w, h] = params.map(p => num(p));
          const p = createPlatform(triggers, id, 'trigger', x, y, w, h);
          p.setAlpha(mapJson.locked ? .5 : 1);
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
            } else if (mapJson.hasCrab) {
              h.addHistory(HumanEvent.DANGEROUS_CRAB);
            }
            h.getSurprised(200);
          }
        });

        bonusGroup = this.physics.add.group({
          allowGravity: true,
          bounceY: .5,//.2,
          allowDrag: true,
          useDamping: true,
        });

        Object.entries(mapJson.bonus ?? {}).forEach(([id, params]) => {
          let bonus: any;
          if (!Array.isArray(params)) {
            const { x, y, frame } = params;
            bonus = createDynamic(indicators, bonusGroup, id, 'bonus', x, y, frame, BONUS_SIZE, BONUS_SIZE, undefined, {
              onDelete(bonus) {
                (bonus as any).triangle?.destroy(true);
                (bonus as any).triangle_back?.destroy(true);
              },
              onCopy: (result, id) => {
                makeBonusChangeTriangle(this, result, id);
                bonuses.push(result);

                result?.body?.gameObject?.setPushable(false);
                result?.body?.gameObject?.setDamping(true);
                result?.body?.gameObject?.setDrag(.01);
                result?.body?.gameObject?.setCollideWorldBounds(true);
                result?.body?.gameObject?.preFX.addGlow(0xffffcc, 1);
              },
            });
          } else {
            const [x, y, frame] = params.map(p => num(p));
            bonus = createDynamic(indicators, bonusGroup, id, 'bonus', x, y, frame, BONUS_SIZE, BONUS_SIZE, undefined, {
              onDelete(bonus) {
                (bonus as any).triangle?.destroy(true);
              },
              onCopy: (result, id) => {
                makeBonusChangeTriangle(this, result, id);
                bonuses.push(result);

                result?.body?.gameObject?.setPushable(false);
                result?.body?.gameObject?.setDamping(true);
                result?.body?.gameObject?.setDrag(.01);
                result?.body?.gameObject?.setCollideWorldBounds(true);
                result?.body?.gameObject?.preFX.addGlow(0xffffcc, 1);
                if (result) {
                  (result as any).indic.bonus = bonus;
                }
              },
            });
          }
          if (canEditLevel) {
            makeBonusChangeTriangle(this, bonus, id);
          }
          bonus.body?.gameObject?.setPushable(false);
          bonus.body?.gameObject?.setDamping(true);
          bonus.body?.gameObject?.setDrag(.01);
          bonus.body?.gameObject?.setCollideWorldBounds(true);
          bonus.body?.gameObject?.preFX.addGlow(0xffffcc, 1);
          bonus.indic.bonus = bonus;

          bonuses.push(bonus);
        });

        const powerCollision = (human: any, bonus: any) => {
          const h: Human = (human as any).human;
          if (!h.frozen && !h.acquiringPower()) {
            h.getPower(bonus as any, zzfx);
          }
        };
        this.physics.add.collider(humanGroup, bonusGroup, powerCollision);
        this.physics.add.overlap(humanGroup, bonusGroup, powerCollision);
        this.physics.add.collider(bonusGroup, rocks);


        this.physics.add.collider(bonusGroup, platforms, (bonus, platform) => {
        }, undefined, this);

        this.physics.add.collider(trollGroup, bonusGroup);


        this.physics.add.collider(trollGroup, trollGroup, (t1: any, t2: any) => {
          const dx = t2.x - t1.x;
          t1.setVelocityX(-dx * 10); t2.setVelocityX(dx * 10);
        });


        keyGroup = this.physics.add.group({
          allowGravity: true,
        });
        this.physics.add.collider(keyGroup, platforms);
        this.physics.add.collider(trollGroup, keyGroup);
        this.physics.add.collider(rocks, keyGroup);
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
            const b = createDynamic(indicators, keyGroup, id, 'key', x, y, frame, 45, 45, undefined, {
              onCopy(b: any) {
                (b as any).anims.play('key_anim');
                (b as any).isKey = true;
                b.setDamping(true);
                b.setDrag(.01);
                b.setCollideWorldBounds(true);
                b.preFX?.addGlow(0xccffff, 1);
                b.indic.key = b;
              },
            });
            if (b) {
              (b as any).anims.play('key_anim');
              (b as any).isKey = true;
              b.setDamping(true);
              b.setDrag(.01);
              b.setCollideWorldBounds(true);
              b.preFX?.addGlow(0xccffff, 1);
              b.indic.key = b;
            }
            return;
          }
          const [x, y, frame] = params.map(p => num(p));
          const b = createDynamic(indicators, keyGroup, id, 'key', x, y, frame, 45, 45, undefined, {
            onCopy(b: any) {
              (b as any).anims.play('key_anim');
              (b as any).isKey = true;
              b.setDamping(true);
              b.setDrag(.01);
              b.setCollideWorldBounds(true);
              b.preFX?.addGlow(0xccffff, 1);
              b.indic.key = b;
            },
          });
          if (b) {
            (b as any).anims.play('key_anim');
            (b as any).isKey = true;
            b.setDamping(true);
            b.setDrag(.01);
            b.setCollideWorldBounds(true);
            b.preFX?.addGlow(0xccffff, 1);
            b.indic.key = b;
          }
        });

        let nextLabel = 'A';
        const labelForTrigger: Record<string, string> = {};
        function getLabelForTrigger(trigger?: string) {
          if (!trigger) {
            return undefined;
          }
          if (!labelForTrigger[trigger]) {
            labelForTrigger[trigger] = nextLabel;
            nextLabel = String.fromCharCode(nextLabel.charCodeAt(0) + 1);
          }
          return labelForTrigger[trigger];
        }

        buttonGroup = this.physics.add.staticGroup();
        Object.entries(mapJson.button ?? {}).forEach(([id, params]) => {
          const { x, y, width, height, trigger } = params;
          const b = createPlatform(buttonGroup, id, 'button', x, y, width, height);

          const label = getLabelForTrigger(trigger);
          if (label) {
            const labelText = ui.add.text(x, y, label, {
              fontSize: '14pt', color: '#fff',
              shadow: {
                color: "black",
                fill: true,
                offsetX: 1,
                offsetY: 1,
              }
            });
            (b as any).labelText = labelText;
            labelText.setPosition(x - labelText.width / 2, y + height / 2 + 2);
          }

          if (b) {
            (b as any).anims.play('button_up');
            (b as any).setDisplaySize(width, height).refreshBody();
            (b as any).trigger = trigger;
          }
        });
        gateGroup = this.physics.add.staticGroup();
        Object.entries(mapJson.gate ?? {}).forEach(([id, params]) => {
          const { x, y, width, height } = params;
          const label = getLabelForTrigger(id);
          const horizontal = width > height;
          const b = createPlatform(gateGroup, id, 'gate', x, y, width, height);
          if (label) {
            const labelText = ui.add.text(x, y, label, {
              fontSize: '14pt', color: '#fff',
              shadow: {
                color: "black",
                fill: true,
                offsetX: 1,
                offsetY: 1,
              }
            });
            (b as any).labelText = labelText;
            labelText.setPosition(x - labelText.width / 2, y - labelText.height / 2);
          }


          if (b) {
            (b as any).anims.play(horizontal ? 'hgate_close' : 'gate_up');
            (b as any).setDisplaySize(width, height);
            (b as any).refreshBody();
            triggerItems[id] = () => {
              if (!(b as any).opened) {
                (b as any).opened = true;
                (b as any).anims.play(horizontal ? 'hgate_open' : 'gate_down');
                zzfx(...[, , 766, .02, .2, .41, 3, 2.72, , .8, , , , .4, , .1, , .39, .11]); // Explosion 525
                setTimeout(() => {
                  (b as any).disableBody(true, false);
                }, 300);
              } else {
                (b as any).opened = false;
                (b as any).enableBody(false, undefined, undefined, true, true);
                (b as any).anims.play(horizontal ? 'hgate_close' : 'gate_up');
                zzfx(...[, , 766, .02, .2, .41, 3, 2.72, , .8, , , , .4, , .1, , .39, .11]); // Explosion 525  
              }
            };
          }
        });
        this.physics.add.collider(trollGroup, gateGroup);
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
        this.physics.add.collider(trollGroup, buttonGroup, onCollidePushButton);
        this.physics.add.collider(humanGroup, buttonGroup, onCollidePushButton);
        this.physics.add.collider(rocks, buttonGroup, onCollidePushButton);
        this.physics.add.collider(keyGroup, buttonGroup, onCollidePushButton);
        this.physics.add.collider(bonusGroup, buttonGroup, onCollidePushButton);


        this.physics.add.overlap(waterGroup, trollGroup, (water, player) => {
          if (!gameOver) {
            setTimeout(() => {
              this.physics.pause();
            }, 200);
            const p = player as any;

            p.troll.setTint(0xff0000);
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

        const keyToDoor = (key: Phaser.GameObjects.GameObject | Phaser.Tilemaps.Tile, door: Phaser.GameObjects.GameObject | Phaser.Tilemaps.Tile) => {
          if (!((door as any).isOpen)) {
            (door as any).anims.play("door_open");
            (door as any).isOpen = true;
            key.destroy(true);

            zzfx(...[26, , 117, , , .06, 4, .08, -0.1, -6, , , , , , .6, , .04, , .33]); // Random 282
          }
        };

        this.physics.add.collider(keyGroup, doorGroup, keyToDoor);
        this.physics.add.overlap(keyGroup, doorGroup, keyToDoor);

        this.physics.add.overlap(doorGroup, humanGroup, (door, human) => {
          const humanObj = (human as any).human as Human;
          if ((door as any).isOpen) {
            humanObj.addHistory(HumanEvent.FOUND_DOOR_OPENED);
          } else {
            humanObj.addHistory(HumanEvent.FOUND_DOOR_CLOSED);
          }
        });

        this.physics.add.overlap(trollGroup, doorGroup, (player, door) => {
          if ((door as any).isOpen) {
            (player as any).troll.destroy();
            zzfx(...[1.03, , 415, .05, .3, .46, 1, 1.91, 2.7, , , , .16, , 11, .1, , .69, .24, .27]); // Powerup 271
            if (trolls.every(troll => troll.destroyed)) {
              ui.victory();
              nextLevelOverride = (door as any).nextLevel;
              (door as any).anims.play("door_close");
            }
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

        //        const hero = trollo;
        this.physics.add.collider(trollGroup, bombs, (player, bomb) => {
          this.physics.pause();
          const p = player as any;

          p.troll.setTint(0xff0000);
          ui.gameOver();

          gameOver = true;
        }, undefined, this);

        const onTrollContactHuman = (player: any, human: any) => {
          const humanObj = (human as any).human as Human;
          const trollObj = (player as any).troll as Troll;
          if (humanObj.frozen || humanObj.vanishing || trollObj.vanishing) {
            return;
          }

          this.physics.pause();
          const p = player as any;

          trollObj.setTint(0xff0000);
          ui.gameOver();
          zzfx(...[1.32, , 692, .04, .21, .24, , .16, , , , , .05, , 9, .1, .03, .69, .2, .11]); // Powerup 256

          gameOver = true;

        };

        this.physics.add.collider(trollGroup, humanGroup, onTrollContactHuman);
        this.physics.add.overlap(trollGroup, humanGroup, onTrollContactHuman);
      },
      update() {
        ghostPlatform?.setPosition(game.input.mousePointer?.x, game.input.mousePointer?.y);

        const now = Date.now();
        const dt = 1.5;//Math.min(3, Math.max(1, (now - preTime) / 10));
        //console.log(dt);

        //        const hero = trollo;
        if (visTime && now - visTime > 500) {
          trolls[0].player.scene.scene.setVisible(true);
          visTime = 0;
        }

        if (gameOver) {
          const flipX = Math.random() < .5 ? true : false;
          trolls.forEach(troll => troll.setFlipX(flipX));
          return;
        }

        if (canEditLevel) {
          if (Phaser.Input.Keyboard.JustDown((cursors as any).delete)) {
            onDeleteSelected?.();
            onDeselect?.();
          }
          if (Phaser.Input.Keyboard.JustDown((cursors as any).esc)) {
            onDeselect?.();
            setUiIndex(-1);
          }
        }

        const dxKeys = [
          ((cursors as any)?.left2.isDown ? -1 : 0) + ((cursors as any)?.right2.isDown ? 1 : 0),
          (cursors?.left.isDown ? -1 : 0) + (cursors?.right.isDown ? 1 : 0)];
        const jumpKeys = [cursors?.space.isDown || (cursors as any)?.up2.isDown, cursors?.up.isDown];
        const pickingUpKeys = [
          Phaser.Input.Keyboard.JustDown((cursors as any).f),
          Phaser.Input.Keyboard.JustDown((cursors as any).p),
        ];
        const crouchKeys = [(cursors as any)?.down2.isDown, cursors?.down.isDown];

        if (trolls.length > 1) {
          trolls.forEach((troll, index) => {
            if (troll.humanBrain) {
              troll.humanBrain.dx = dxKeys[index];
              if (jumpKeys[index]) {
                troll.humanBrain.tryJump(zzfx, false, -420);
              }
            } else {
              troll.dx = dxKeys[index];
              if (jumpKeys[index]) {
                troll.tryJump(zzfx);
              }
              troll.crouch = crouchKeys[index];
              if (pickingUpKeys[index]) {
                troll.hold(bonusGroup, zzfx, ui, { isBonus: true });
                troll.hold(keyGroup, zzfx, ui, { isKey: true });
                troll.hold(troll.trollGroup, zzfx, ui, { isTroll: true });
                troll.hold(humanGroup, zzfx, ui, {
                  isHuman: true, condition(item) {
                    return (item as any).human.frozen;
                  },
                });
                ui.showCanGrab(false);
              }
            }
          });
        } else {
          const troll = trolls[0];
          if (troll.humanBrain) {
            troll.humanBrain.dx = dxKeys[0] || dxKeys[1];
            if (jumpKeys[0] || jumpKeys[1]) {
              troll.humanBrain.tryJump(zzfx, false, -420);
            }
          } else {
            troll.dx = dxKeys[0] || dxKeys[1];
            if (jumpKeys[0] || jumpKeys[1]) {
              troll.tryJump(zzfx);
            }
            troll.crouch = crouchKeys[0] || crouchKeys[1];
            if (pickingUpKeys[0] || pickingUpKeys[1]) {
              troll.hold(bonusGroup, zzfx, ui);
              troll.hold(keyGroup, zzfx, ui, { isKey: true });
              troll.hold(troll.trollGroup, zzfx, ui, { isTroll: true });
              troll.hold(humanGroup, zzfx, ui, {
                isHuman: true, condition(item) {
                  return (item as any).human.frozen;
                },
              });
              ui.showCanGrab(false);
            }
          }
        }

        trolls.forEach(troll => {
          if (!troll.holdingBonus) {
            const item = troll.humanBrain ? undefined : troll.foreObject(bonusGroup)
              ?? troll.foreObject(keyGroup)
              ?? troll.foreObject(troll.trollGroup)
              ?? troll.foreObject(humanGroup, h => (h as any).human?.frozen);
            if (item) {
              ui.showCanGrab(true);
            } else {
              ui.showCanGrab(false);
            }
          }
        });

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
          trolls.forEach(troll => {
            if (!human.sawTroll) {
              const dx = Math.abs(human.player.x - troll.player.x);
              const dy = Math.abs(human.player.y - troll.player.y);
              if (dy < 50 && dx < 150) {
                human.sawTroll = Date.now();
                if (!human.frozen) {
                  human.dx = Math.sign(troll.player.x - human.player.x);
                  const flipX = human.dx < 0;
                  human.setFlipX(flipX);
                }

                human.addHistory(HumanEvent.SAW_TROLL);
                human.getSurprised();
                human.lastStill = Date.now();
              }
            }
          });
        });
        humans.forEach(human => human.update(dt, zzfx));
        trolls.forEach(troll => troll.update(dt, zzfx));


        if (Date.now() - lastDialog > 10000 && !victory && !gameOver) {
          const h = humans.filter(hum => !hum.frozen);
          h[Math.floor(Math.random() * h.length)]?.speakAI();
        }
        if (canEditLevel) {
          bonuses.forEach(bonus => {
            bonus.triangle?.setPosition(bonus.indic.x + 24, bonus.indic.y);
            bonus.triangle_back?.setPosition(bonus.indic.x - 24, bonus.indic.y);
          });
          if (selectedElement) {
            const s = selectedElement as any;
            const subject = s.subject ?? s.human?.player ?? s.troll?.player ?? s.bonus ?? s.key ?? s.rock;
            if (subject) {
              s.subject = subject;
              subject.setPosition(s.x, s.y);
              subject.setVelocity(0, 0);
            }
          }
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
    button.textContent = `NEXT LEVEL ${parseInt(level ?? 0) + 1}`;
    button.addEventListener("click", () => {
      nextLevel(true);
    });
    button.disabled = !!mapJson.theEnd;

    const lockCheck = levelUi.appendChild(document.createElement("input"));
    lockCheck.id = "lockCheck;"
    lockCheck.type = "checkbox";
    lockCheck.checked = mapJson.locked;
    const label = levelUi.appendChild(document.createElement("label"));
    label.htmlFor = "lockCheck";
    label.textContent = "lock";
    lockCheck.addEventListener("change", async () => {
      console.log(lockCheck.checked);
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
    startedTimeout.add(setTimeout(() => {
      createHighSchoolGame(jsonUrl, saveUrl, forceLock, false);
    }, 100));
  }

  let startingNextGame = false;
  function nextLevel(skippedThrough?: boolean) {
    if (startingNextGame) {
      return;
    }
    startingNextGame = true;
    game.destroy(true);
    if (instruct?.parentElement === document.body) {
      document.body.removeChild(instruct);
    }
    if (levelUi?.parentElement === document.body) {
      document.body.removeChild(levelUi);
    }
    startedTimeout.add(setTimeout(() => {
      createHighSchoolGame(nextLevelOverride ?? (mapJson.theEnd ? undefined : `json/map${parseInt(level ?? 0) + 1}.json`) ?? jsonUrl, saveUrl, undefined, skippedThrough);
    }, 100));
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

    let customFieldsParams = "";
    Object.entries(customFields).forEach(([key, field]) => {
      customFieldsParams += `&${key}${field.type ? `:${field.type}` : ""}=${field.value}`;
    });

    if (conf.canCallAI && !forceJsonP) {
      const response = await fetch(`/ai?dictionary=${JSON.stringify(dico)}&situation=${HumanEvent.LANG}.${situation}&seed=${seed ?? ""}${customFieldsParams}`);
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
        const url = `${OPEN_AI_URL}?dictionary=${JSON.stringify(dico)}&situation=${HumanEvent.LANG}.${situation}&seed=${seed ?? ""}${customFieldsParams}&jsonp=fetchAIResponse`;
        const parent = document.head;
        const sc = parent.appendChild(document.createElement("script"));
        sc.src = url;
        setTimeout(() => {
          parent.removeChild(sc);
        }, 1000);
      });
    }
  }
  (window as any).fetchAI = fetchAI;

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


window.addEventListener("beforeunload", function (e) {
  this.speechSynthesis.cancel();
});
