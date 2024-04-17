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

export function createHighSchoolGame() {
  let scoreText: Phaser.GameObjects.Text;
  let animations: Record<keyof BodyEnum | string, {
    walk: Phaser.Animations.Animation | false,
    still: Phaser.Animations.Animation | false,
  }> = {};
  let gameOver = false;
  let cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  let player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | undefined;
  let mainCamera: Phaser.Cameras.Scene2D.Camera;
  let flipX = false;
  let body: Phaser.GameObjects.Sprite;
  let underwear: Phaser.GameObjects.Sprite;
  let shirt: Phaser.GameObjects.Sprite;
  let pants: Phaser.GameObjects.Sprite;
  let skirt: Phaser.GameObjects.Sprite;
  let smallshoes: Phaser.GameObjects.Sprite;
  let shoes: Phaser.GameObjects.Sprite;
  const faceSprites: Phaser.GameObjects.Sprite[] = [
  ];
  const bodySprites: Phaser.GameObjects.Sprite[] = [
  ];
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 2000 },
        debug: false
      }
    },
    scene: {
      preload() {
        {
          this.load.image('sky', 'assets/sky.png');
          this.load.image('ground', 'assets/platform.png');
          this.load.image('star', 'assets/star.png');
          this.load.image('bomb', 'assets/bomb.png');
          this.load.spritesheet('hi',
            'assets/hischooler.png',
            { frameWidth: 64, frameHeight: 64 }
          );
        }
      },
      create() {
        let score: number = 0;

        this.add.image(400, 300, 'sky');

        const platforms = this.physics.add.staticGroup();

        platforms.create(400, 568, 'ground').setScale(2).refreshBody();

        platforms.create(600, 400, 'ground');
        platforms.create(50, 250, 'ground');
        platforms.create(750, 220, 'ground');

        player = this.physics.add.sprite(100, 450, 'hi', 56);

        player.setBounce(0.2);
        player.setCollideWorldBounds(true);

        bodySprites.push(
          body = this.add.sprite(0, 0, "hi", 10),   //  body
          underwear = this.add.sprite(0, 0, "hi", 71),   //  underwear
          shirt = this.add.sprite(0, 0, "hi", 31),  //  shirt
          pants = this.add.sprite(0, 0, "hi", 15),  //  pants
          skirt = this.add.sprite(0, 0, "hi", 19),  //  skirt
          smallshoes = this.add.sprite(0, 0, "hi", 23),  //  smallshoes
          shoes = this.add.sprite(0, 0, "hi", 27),  //  shoes
        );

        faceSprites.push(
          this.add.sprite(0, 0, "hi", 36),  //  face
          this.add.sprite(0, 0, "hi", 41),  //  mouth
          this.add.sprite(0, 0, "hi", 46),  //  nose
          this.add.sprite(0, 0, "hi", 51),  //  eyes
          this.add.sprite(0, 0, "hi", 57),  //  eyelashes
          this.add.sprite(0, 0, "hi", 61),  //  hair
          this.add.sprite(0, 0, "hi", 66),  //  hat
        );
        randomSprite(Math.random(), faceSprites, bodySprites);

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

        this.physics.add.collider(player, platforms);
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

        scoreText = this.add.text(16, 16, 'score: 0', { fontSize: '32px', color: '#fff' });

        this.physics.add.collider(stars, platforms);
        this.physics.add.overlap(player, stars, (player, star) => {
          (star as any).disableBody(true, true);

          score += 10;
          scoreText.setText('Score: ' + score);

          if (stars.countActive(true) === 0) {
            stars.children.iterate(function (child) {

              (child as any).enableBody(true, (child as any).x, 0, true, true);
              return null;
            });

            var x = ((player as any).x < 400) ? Phaser.Math.Between(400, 800) : Phaser.Math.Between(0, 400);

            var bomb = bombs.create(x, 16, 'bomb');
            bomb.setBounce(1);
            bomb.setCollideWorldBounds(true);
            bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);

            randomSprite(Math.random(), faceSprites, bodySprites);
          }

        }, undefined, this);

        const bombs = this.physics.add.group();

        this.physics.add.collider(bombs, platforms);

        this.physics.add.collider(player, bombs, (player, bomb) => {
          this.physics.pause();
          const p = player as any;

          bodySprites.forEach(sprite => sprite?.setTint(0xff0000));
          faceSprites.forEach(sprite => sprite?.setTint(0xFF0000));
          this.add.text(p.x - 100, p.y, 'GAME\nOVER', { fontSize: '64px', color: '#f00' });

          gameOver = true;
        }, undefined, this);
        player.body.useDamping = true;
        mainCamera = this.cameras.main;
      },
      update() {
        if (gameOver) {
          const flipX = Math.random() < .5 ? true : false;
          bodySprites.forEach(sprite => sprite?.setFlipX(flipX));
          faceSprites.forEach(sprite => sprite?.setFlipX(flipX));
          return;
        }
        const dx = (cursors?.left.isDown ? -1 : 0) + (cursors?.right.isDown ? 1 : 0);
        const dy = (cursors?.up.isDown ? -1 : 0) + (cursors?.down.isDown ? 1 : 0);
        const headShift = body?.anims.currentFrame?.index === 1 || player?.anims.currentFrame?.index === 3 ? -1 : 0;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const speed = 2 / dist;


        // player?.setPosition(player.x + dx * speed, player.y + dy * speed);
        if (dx) {
          player?.setVelocityX(320 * dx);
          flipX = dx < 0;
          player?.setFlipX(flipX);
          bodySprites.forEach(sprite => sprite?.setFlipX(flipX));
          faceSprites.forEach(sprite => sprite?.setFlipX(flipX));
        }

        // if (dy) {
        //   player?.setVelocityY(160 * dy);
        // }
        if (cursors?.space.isDown && player?.body.touching.down) {
          player.setVelocityY(-1000);
        }

        player?.setDrag(player?.body.touching.down ? .0001 : 1);

        if (!dx && !dy) {
          bodySprites.forEach((sprite, index) => sprite.anims.play(`still_${index}`, true));
        } else {
          bodySprites.forEach((sprite, index) => sprite.anims.play(`walk_${index}`, true));
        }

        if (player) {
          // mainCamera.setPosition(-player.x + 400, -player.y + 300);
          bodySprites.forEach(sprite => sprite.setPosition(player!.x, player!.y));
          faceSprites.forEach(sprite => sprite.setPosition(player!.x, player!.y + 2 * headShift));
          // scoreText.setPosition(-mainCamera.x + 16, -mainCamera.y + 16);
        }
      },
    }
  };

  return new Phaser.Game(config);
}
