// To recognize dom types (see https://bun.sh/docs/typescript#dom-types):
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />


import Phaser from "phaser";
import { alea } from "seedrandom";

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

class Elem {
  dx: number = 0;

  constructor(protected sprite: string, public player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
    this.player.setBounce(0.2);
    this.player.setCollideWorldBounds(true);
    this.player.body.useDamping = true;
  }
}

class Troll extends Elem {
  trollSprites: Phaser.GameObjects.Sprite[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super('troll', scene.physics.add.sprite(x, y, 'troll', 11));

    this.trollSprites.push(
      scene.add.sprite(0, 0, "troll", 0),
    );
  }

  setTint(color: number) {
    this.trollSprites.forEach(sprite => sprite.setTint(color));
  }

  setFlipX(flipX: boolean) {
    this.trollSprites.forEach(sprite => sprite.setFlipX(flipX));
  }

  update(dt: number = 1) {
    this.player.setDrag(this.player.body.touching.down ? .0001 : 1);

    const headShift = this.trollSprites[BodyEnum.BODY]?.anims.currentFrame?.index === 1 || this.player.anims.currentFrame?.index === 3 ? -2 : 0;
    this.trollSprites.forEach(sprite => sprite.setPosition(this.player.x, this.player.y));

    if (this.dx) {
      this.player.setVelocityX(150 * this.dx * dt);
      const flipX = this.dx < 0;
      this.setFlipX(flipX);
    }

    if (!this.dx) {
      this.trollSprites.forEach((sprite, index) => sprite.anims.play(`troll_still`, true));
    } else {
      this.trollSprites.forEach((sprite, index) => sprite.anims.play(`troll_walk`, true));
    }
  }

  tryJump() {
    if (this.player.body.touching.down) {
      this.player.setVelocityY(-1000);
    }
  }

  setScale(scaleX: number, scaleY: number) {
    [this.player, ...this.trollSprites].forEach(sprite => sprite.setScale(scaleX, scaleY));
  }
}

class Human extends Elem {
  faceSprites: Phaser.GameObjects.Sprite[] = [];
  bodySprites: Phaser.GameObjects.Sprite[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super('hi', scene.physics.add.sprite(x, y, 'hi', 56));

    this.bodySprites.push(
      scene.add.sprite(0, 0, "hi", 10),   //  body
      scene.add.sprite(0, 0, "hi", 71),   //  underwear
      scene.add.sprite(0, 0, "hi", 31),  //  shirt
      scene.add.sprite(0, 0, "hi", 15),  //  pants
      scene.add.sprite(0, 0, "hi", 19),  //  skirt
      scene.add.sprite(0, 0, "hi", 23),  //  smallshoes
      scene.add.sprite(0, 0, "hi", 27),  //  shoes
    );

    this.faceSprites.push(
      scene.add.sprite(0, 0, "hi", 36),  //  face
      scene.add.sprite(0, 0, "hi", 41),  //  mouth
      scene.add.sprite(0, 0, "hi", 46),  //  nose
      scene.add.sprite(0, 0, "hi", 51),  //  eyes
      scene.add.sprite(0, 0, "hi", 57),  //  eyelashes
      scene.add.sprite(0, 0, "hi", 61),  //  hair
      scene.add.sprite(0, 0, "hi", 66),  //  hat
    );
    this.randomize(Math.random());
  }

  randomize(seed: any = Math.random()) {
    randomSprite(seed, this.faceSprites, this.bodySprites);
  }

  setTint(color: number) {
    this.bodySprites.forEach(sprite => sprite.setTint(color));
    this.faceSprites.forEach(sprite => sprite.setTint(color));
  }

  setFlipX(flipX: boolean) {
    this.bodySprites.forEach(sprite => sprite.setFlipX(flipX));
    this.faceSprites.forEach(sprite => sprite.setFlipX(flipX));
  }

  update(dt: number = 1) {
    this.player.setDrag(this.player.body.touching.down ? .0001 : 1);

    const headShift = this.bodySprites[BodyEnum.BODY]?.anims.currentFrame?.index === 1 || this.player.anims.currentFrame?.index === 3 ? -2 : 0;
    this.bodySprites.forEach(sprite => sprite.setPosition(this.player.x, this.player.y));
    this.faceSprites.forEach(sprite => sprite.setPosition(this.player.x, this.player.y + 2 * headShift));

    if (this.dx) {
      this.player.setVelocityX(150 * this.dx * dt);
      const flipX = this.dx < 0;
      this.setFlipX(flipX);
    }

    if (!this.dx) {
      this.bodySprites.forEach((sprite, index) => sprite.anims.play(`still_${index}`, true));
    } else {
      this.bodySprites.forEach((sprite, index) => sprite.anims.play(`walk_${index}`, true));
    }
  }

  tryJump() {
    if (this.player.body.touching.down) {
      this.player.setVelocityY(-1000);
    }
  }

  setScale(scaleX: number, scaleY: number) {
    [this.player, ...this.bodySprites, ...this.faceSprites].forEach(sprite => sprite.setScale(scaleX, scaleY));
  }
}

function randomSprite(
  seed: any,
  faceSprites: Phaser.GameObjects.Sprite[],
  bodySprites: Phaser.GameObjects.Sprite[]) {

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
  const skinColor = Math.floor(rng() * 0xFFFFFF) | 0x996666;
  faceSprites[FaceEnum.SHAPE].setTint(skinColor);
  bodySprites[BodyEnum.BODY].setTint(skinColor);

  //  SHIRT
  bodySprites[BodyEnum.SHIRT].setVisible(rng() < .7);

  // SHOES
  if (rng() < .5) {
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
}

let scoreText: Phaser.GameObjects.Text;
class UI extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    scoreText = this.add.text(16, 16, 'score: 0', { fontSize: '32px', color: '#fff' });
  }
}

//  size 400,32
function createPlatform(platforms: Phaser.Physics.Arcade.StaticGroup,
  key: string,
  x: number, y: number,
  width?: number, height?: number
) {
  const platform = platforms.create(x, y, key);
  if (width && height) {
    platform.setScale(width / 400, height / 32).refreshBody();
  }
  return platform;
}


export function createHighSchoolGame() {
  let animations: Record<keyof BodyEnum | string, {
    walk: Phaser.Animations.Animation | false,
    still: Phaser.Animations.Animation | false,
  }> = {};
  let gameOver = false;
  let cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  let human: Human;
  let troll: Troll;
  let mainCamera: Phaser.Cameras.Scene2D.Camera;
  let preTime: number;
  let sky: Phaser.GameObjects.Image;
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
      default: 'arcade',
      arcade: {
        x: 0, y: 0, width: 1600, height: 600,
        gravity: { x: 0, y: 2000 },
        debug: false
      }
    },
    scene: [{
      preload() {
        {
          this.load.image('sky', 'assets/sky.png');
          this.load.image('ground', 'assets/platform.png');
          this.load.image('red', 'assets/redbox.png');
          this.load.image('star', 'assets/star.png');
          this.load.image('bomb', 'assets/bomb.png');
          this.load.spritesheet('hi',
            'assets/hischooler.png',
            { frameWidth: 64, frameHeight: 64 }
          );
          this.load.spritesheet('troll',
            'assets/troll.png',
            { frameWidth: 32, frameHeight: 32 }
          );
        }
      },
      create() {
        this.scene.launch('UIScene');


        let score: number = 0;

        sky = this.add.image(400, 300, 'sky');

        const platforms = this.physics.add.staticGroup();

        createPlatform(platforms, 'ground', 800, 568, 1600, 64);
        createPlatform(platforms, 'ground', 600, 400);
        createPlatform(platforms, 'ground', 50, 250);
        createPlatform(platforms, 'ground', 750, 220);
        createPlatform(platforms, 'red', 600 - 200, 400 - 10);
        createPlatform(platforms, 'red', 600 + 200, 400 - 10);

        troll = new Troll(this, 200, 350);
        troll.setScale(2, 2);

        human = new Human(this, 100, 450);
        human.setScale(1, 1.5);

        const trollAnimation = {
          walk: this.anims.create({
            key: `troll_walk`,
            frames: this.anims.generateFrameNumbers('troll', { start: 1, end: 6 }),
            frameRate: 20,
            repeat: -1,
          }),
          still: this.anims.create({
            key: `troll_still`,
            frames: this.anims.generateFrameNumbers('troll', { start: 0, end: 0 }),
            frameRate: 20,
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
          };
        }

        this.physics.add.collider(human.player, platforms);
        this.physics.add.collider(troll.player, platforms);
        cursors = this.input.keyboard?.addKeys({
          up: Phaser.Input.Keyboard.KeyCodes.W,
          down: Phaser.Input.Keyboard.KeyCodes.S,
          left: Phaser.Input.Keyboard.KeyCodes.A,
          right: Phaser.Input.Keyboard.KeyCodes.D,
          space: Phaser.Input.Keyboard.KeyCodes.SPACE,
        }) as Phaser.Types.Input.Keyboard.CursorKeys;



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

            human.randomize();
          }

        }, undefined, this);

        const bombs = this.physics.add.group();

        this.physics.add.collider(bombs, platforms);

        const hero = troll;
        this.physics.add.collider(hero.player, bombs, (player, bomb) => {
          this.physics.pause();
          const p = player as any;

          hero.setTint(0xff0000);
          this.add.text(p.x - 100, p.y, 'GAME\nOVER', { fontSize: '64px', color: '#f00' });

          gameOver = true;
        }, undefined, this);
        mainCamera = this.cameras.main;
      },
      update() {
        const now = Date.now();
        const dt = (now - preTime) / 10;
        preTime = now;

        const hero = troll;
        if (gameOver) {
          const flipX = Math.random() < .5 ? true : false;
          hero.setFlipX(flipX);
          return;
        }
        const dx = (cursors?.left.isDown ? -1 : 0) + (cursors?.right.isDown ? 1 : 0);

        hero.dx = dx;

        if (cursors?.space.isDown) {
          hero.tryJump();
        }

        mainCamera.scrollX = hero.player.x - 400;
        mainCamera.scrollY = hero.player.y - 300;
        sky.setPosition(mainCamera.scrollX + 400, mainCamera.scrollY + 300);
        human.update(dt);
        troll.update(dt);
      },
    }, UI],
  };

  document.body.appendChild(document.createElement("div")).textContent = "Keys: AWSD to move, SPACE to jump"

  const game = new Phaser.Game(config);
  return game;
}
