import Phaser from "phaser";

export function createGame() {
  let cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  let player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | undefined;
  const config: Phaser.Types.Core.GameConfig = {
    // type: Phaser.AUTO,
    // width: 800,
    // height: 600,
    // scene: Example,
    // physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 200 } } }

    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 300 },
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
          this.load.spritesheet('dude',
            'assets/dude.png',
            { frameWidth: 32, frameHeight: 48 }
          );
        }
      },
      create() {
        let score: number = 0;

        this.add.image(400, 300, 'sky');
        //        this.add.image(400, 300, 'star');

        const platforms = this.physics.add.staticGroup();

        platforms.create(400, 568, 'ground').setScale(2).refreshBody();

        platforms.create(600, 400, 'ground');
        platforms.create(50, 250, 'ground');
        platforms.create(750, 220, 'ground');

        player = this.physics.add.sprite(100, 450, 'dude');

        player.setBounce(0.2);
        player.setCollideWorldBounds(true);

        this.anims.create({
          key: 'left',
          frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
          frameRate: 10,
          repeat: -1
        });

        this.anims.create({
          key: 'turn',
          frames: [{ key: 'dude', frame: 4 }],
          frameRate: 20
        });

        this.anims.create({
          key: 'right',
          frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
          frameRate: 10,
          repeat: -1
        });

        this.physics.add.collider(player, platforms);
        cursors = this.input.keyboard?.createCursorKeys();

        const stars = this.physics.add.group({
          key: 'star',
          repeat: 11,
          setXY: { x: 12, y: 0, stepX: 70 }
        });

        stars.children.iterate(function (child: Phaser.GameObjects.GameObject): boolean | null {
          (child as any).setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
          return null;
        });

        const scoreText = this.add.text(16, 16, 'score: 0', { fontSize: '32px', color: '#000' });

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

          }

        }, undefined, this);

        const bombs = this.physics.add.group();

        this.physics.add.collider(bombs, platforms);

        let gameOver = false;
        this.physics.add.collider(player, bombs, (player, bomb) => {
          this.physics.pause();
          (player as any).setTint(0xff0000);

          (player as any).anims.play('turn');

          gameOver = true;
        }, undefined, this);
      },
      update() {
        if (cursors?.left.isDown) {
          player?.setVelocityX(-160);

          player?.anims.play('left', true);
        }
        else if (cursors?.right.isDown) {
          player?.setVelocityX(160);

          player?.anims.play('right', true);
        }
        else {
          player?.setVelocityX(0);

          player?.anims.play('turn');
        }

        if (cursors?.up.isDown && player?.body.touching.down) {
          player.setVelocityY(-330);
        }
      }
    }
  };

  return new Phaser.Game(config);
}
