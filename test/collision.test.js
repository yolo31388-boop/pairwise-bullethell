
const { Bullet } = require('../src/bullet/bullet.js');
const { Hitbox } = require('../src/player/hitbox.js');
const { checkCollision, checkGraze } = require('../src/bullet/collision.js');

describe('弹幕躲避碰撞', () => {
  test('线段碰撞检测', () => {
    const bullet = new Bullet(0, 0, 100, 0, 2);
    const player = new Hitbox(50, 0, 5);
    bullet.update(1);
    expect(checkCollision(bullet, player)).toBe(true);
  });
  test('高速弹幕命中', () => {
    const bullet = new Bullet(-10, 0, 200, 0, 1);
    const player = new Hitbox(50, 0, 3);
    bullet.update(0.5);
    expect(checkCollision(bullet, player)).toBe(true);
  });
  test('碰撞时间计算', () => {
    const bullet = new Bullet(0, 0, 10, 0, 1);
    const player = new Hitbox(5, 0, 1);
    expect(checkCollision(bullet, player)).toBe(false);
    bullet.update(0.5);
    expect(checkCollision(bullet, player)).toBe(true);
  });
  test('无敌帧免疫', () => {
    const bullet = new Bullet(0, 0, 10, 0, 5);
    const player = new Hitbox(0, 0, 5);
    player.invincible = 1;
    bullet.update(0.1);
    expect(checkCollision(bullet, player) && player.invincible > 0).toBe(true);
  });
  test('碰撞后弹幕移除', () => {
    const bullet = new Bullet(0, 0, 10, 0, 5);
    const player = new Hitbox(0, 0, 5);
    bullet.update(0.1);
    if (checkCollision(bullet, player)) bullet.dead = true;
    expect(bullet.dead).toBe(true);
  });
  test('同帧多弹幕结算', () => {
    const bullets = [new Bullet(0,0,10,0,2), new Bullet(0,10,10,0,2)];
    const player = new Hitbox(5, 0, 3);
    let hits = 0;
    for (const b of bullets) { b.update(0.5); if (checkCollision(b, player)) hits++; }
    expect(hits).toBe(1);
  });
  test('受击范围小于视觉', () => {
    const player = new Hitbox(0, 0, 3);
    expect(player.radius).toBeLessThan(10);
  });
  test('不同弹幕体积', () => {
    const small = new Bullet(0,0,0,0,1);
    const large = new Bullet(0,0,0,0,10);
    expect(large.radius).toBeGreaterThan(small.radius);
  });
  test('激光持续伤害', () => {
    const laser = {x:0, y:0, width:5, active:true};
    const player = new Hitbox(0, 0, 3);
    expect(checkCollision({x:0,y:0,vx:0,vy:0,radius:3,prevX:0,prevY:0}, player)).toBe(true);
  });
  test('擦弹判定', () => {
    const bullet = new Bullet(0, 15, 10, 0, 2);
    const player = new Hitbox(5, 0, 3);
    bullet.update(0.5);
    expect(checkGraze(bullet, player)).toBe(true);
  });
  test('碰撞与擦弹不重叠', () => {
    const bullet = new Bullet(0, 0, 10, 0, 2);
    const player = new Hitbox(5, 0, 3);
    bullet.update(0.5);
    const hit = checkCollision(bullet, player);
    const graze = checkGraze(bullet, player);
    expect(hit).toBe(true);
  });
  test('玩家移动中被命中', () => {
    const bullet = new Bullet(0, 0, 0, 10, 2);
    const player = new Hitbox(0, 0, 3);
    player.prevY = 0;
    bullet.update(0.5);
    expect(checkCollision(bullet, player)).toBe(true);
  });
});

const { Laser } = require('../src/bullet/bullet.js');
const { Player } = require('../src/player/hitbox.js');
const {
  resolveCollisions,
  getCollisionTime,
  getCollisionTimeSeconds,
} = require('../src/bullet/collision.js');

describe('扫掠碰撞不变量', () => {
  test('高速穿越：帧末已越过玩家但帧内扫过路径必须命中', () => {
    const bullet = new Bullet(-100, 0, 10000, 0, 1);
    const player = new Hitbox(0, 0, 3);
    bullet.update(1 / 60);
    expect(bullet.x).toBeGreaterThan(50);
    expect(Math.abs(bullet.x - player.x)).toBeGreaterThan(bullet.radius + player.radius);
    expect(checkCollision(bullet, player)).toBe(true);
  });

  test('几何路径相交但不同时经过交点不构成命中', () => {
    const bullet = new Bullet(0, -50, 0, 100, 2);
    const player = new Hitbox(-50, 10, 3);
    player.setVelocity(100, 0);
    bullet.update(1);
    player.update(1);
    expect(checkCollision(bullet, player)).toBe(false);
  });

  test('碰撞时间取最早接触点（单向匀速）', () => {
    const bullet = new Bullet(0, 0, 100, 0, 2);
    const player = new Hitbox(50, 0, 5);
    bullet.update(1);
    expect(getCollisionTime(bullet, player)).toBeCloseTo(0.43, 6);
    expect(getCollisionTimeSeconds(bullet, player, 0.5)).toBeCloseTo(0.215, 6);
  });

  test('碰撞时间对双向移动同样精确（相向运动）', () => {
    const bullet = new Bullet(0, 0, 60, 0, 1);
    const player = new Hitbox(10, 0, 1);
    player.setVelocity(-40, 0);
    bullet.update(1);
    player.update(1);
    expect(getCollisionTime(bullet, player)).toBeCloseTo(0.08, 6);
  });

  test('checkCollision 是纯几何判定，无敌帧不改变其结果', () => {
    const bullet = new Bullet(0, 0, 10, 0, 5);
    const player = new Hitbox(0, 0, 5);
    player.invincible = 2;
    bullet.update(0.1);
    expect(checkCollision(bullet, player)).toBe(true);
  });

  test('无敌帧期间免疫伤害且弹幕继续存在，结束后仍可命中', () => {
    const bullet = new Bullet(0, 0, 10, 0, 2);
    const player = new Hitbox(8, 0, 3);
    player.invincible = 1;
    player.hp = 3;
    bullet.update(1);
    const r1 = resolveCollisions([bullet], player, 1);
    expect(r1.hits).toBe(0);
    expect(bullet.dead).toBe(false);
    expect(player.hp).toBe(3);
    expect(bullet.x).toBe(10);
    player.invincible = 0;
    bullet.update(1);
    const r2 = resolveCollisions([bullet], player, 1);
    expect(r2.hits).toBe(1);
    expect(bullet.dead).toBe(true);
  });

  test('命中弹幕立即 dead，二次结算不造成二次伤害', () => {
    const bullet = new Bullet(0, 0, 10, 0, 2);
    const player = new Hitbox(5, 0, 3);
    player.hp = 5;
    bullet.update(1);
    const r1 = resolveCollisions([bullet], player, 1);
    const r2 = resolveCollisions([bullet], player, 1);
    expect(r1.hits).toBe(1);
    expect(bullet.dead).toBe(true);
    expect(r2.hits).toBe(0);
    expect(player.hp).toBe(4);
  });

  test('同帧多个弹幕分别结算，不合并不丢失', () => {
    const bullets = [
      new Bullet(-30, 0, 100, 0, 2),
      new Bullet(-30, 4, 100, 0, 2),
      new Bullet(-30, -4, 100, 0, 2),
    ];
    const player = new Hitbox(20, 0, 3);
    player.hp = 10;
    bullets.forEach((b) => b.update(1));
    const result = resolveCollisions(bullets, player, 1);
    expect(result.hits).toBe(3);
    expect(result.damage).toBe(3);
    expect(bullets.every((b) => b.dead)).toBe(true);
    expect(player.hp).toBe(7);
  });

  test('玩家受击半径小于视觉半径，getHitbox 只暴露受击范围', () => {
    const player = new Player(0, 0, 4);
    expect(player.radius).toBe(4);
    expect(player.visualRadius).toBeGreaterThan(player.radius);
    const hb = player.getHitbox();
    expect(hb.radius).toBe(4);
    const bullet = new Bullet(0, 0, 0, 0, 2);
    const edge = new Hitbox(7, 0, 4);
    expect(checkCollision(bullet, edge)).toBe(false);
  });

  test('点弹与大弹拥有不同体积：同位置点弹落空、大弹命中', () => {
    const point = Bullet.point(0, 0, 8, 0);
    const large = Bullet.large(0, 0, 8, 0, 10);
    const player = new Hitbox(16, 0, 3);
    point.update(1);
    large.update(1);
    expect(point.type).toBe('point');
    expect(large.type).toBe('large');
    expect(checkCollision(point, player)).toBe(false);
    expect(checkCollision(large, player)).toBe(true);
    const p2 = new Hitbox(16, 0, 3);
    p2.hp = 10;
    expect(resolveCollisions([large], p2, 1).damage).toBe(2);
  });

  test('激光使用线段判定：线段上方垂直距离内命中，延长线外不命中', () => {
    const laser = new Laser(-100, 0, 100, 0, 4);
    const onLine = new Hitbox(50, 4, 3);
    const above = new Hitbox(50, 10, 3);
    const beyondEnd = new Hitbox(150, 0, 3);
    expect(checkCollision(laser, onLine)).toBe(true);
    expect(checkCollision(laser, above)).toBe(false);
    expect(checkCollision(laser, beyondEnd)).toBe(false);
  });

  test('激光持续伤害按帧结算且激光不被移除', () => {
    const laser = new Laser(-100, 0, 100, 0, 4);
    const player = new Hitbox(0, 0, 3);
    player.hp = 10;
    const f1 = resolveCollisions([laser], player, 1 / 60);
    const f2 = resolveCollisions([laser], player, 1 / 60);
    expect(f1.hits).toBe(1);
    expect(f2.hits).toBe(1);
    expect(f1.damage + f2.damage).toBe(2);
    expect(player.hp).toBe(8);
    expect(laser.dead).toBe(false);
    expect(laser.active).toBe(true);
    const safe = new Hitbox(0, 50, 3);
    safe.hp = 10;
    expect(resolveCollisions([laser], safe, 1 / 60).hits).toBe(0);
    expect(safe.hp).toBe(10);
  });

  test('扫掠激光：激光平移经过移动中的玩家必须命中', () => {
    const laser = new Laser(-100, 0, 100, 0, 4);
    laser.setVelocity(200, 0);
    const player = new Hitbox(250, 4, 3);
    laser.update(1);
    expect(laser.x1).toBe(100);
    expect(checkCollision(laser, player)).toBe(true);
    const miss = new Laser(-100, 0, 100, 0, 4);
    miss.setVelocity(200, 0);
    const far = new Hitbox(250, 40, 3);
    miss.update(1);
    expect(checkCollision(miss, far)).toBe(false);
  });

  test('擦弹：命中范围外、擦弹带内触发并计数，每弹只擦一次', () => {
    const bullet = new Bullet(0, 0, 20, 0, 2);
    const player = new Hitbox(10, 9, 3);
    bullet.update(1);
    expect(checkCollision(bullet, player)).toBe(false);
    expect(checkGraze(bullet, player)).toBe(true);
    const counted = new Hitbox(10, 9, 3);
    const b2 = new Bullet(0, 0, 20, 0, 2);
    b2.update(1);
    const r1 = resolveCollisions([b2], counted, 1);
    expect(r1.grazes).toBe(1);
    expect(counted.grazeCount).toBe(1);
    const r2 = resolveCollisions([b2], counted, 1);
    expect(r2.grazes).toBe(0);
    expect(counted.grazeCount).toBe(1);
  });

  test('擦弹与命中互斥：命中的弹幕绝不触发擦弹', () => {
    const bullet = new Bullet(0, 0, 20, 0, 2);
    const player = new Hitbox(10, 0, 3);
    bullet.update(1);
    expect(checkCollision(bullet, player)).toBe(true);
    expect(checkGraze(bullet, player)).toBe(false);
    const far = new Bullet(0, 0, 20, 0, 2);
    const distant = new Hitbox(10, 40, 3);
    far.update(1);
    expect(checkGraze(far, distant)).toBe(false);
  });

  test('玩家移动扫过静止弹幕必须命中（帧末已远离）', () => {
    const bullet = new Bullet(10, 0, 0, 0, 2);
    const player = new Hitbox(0, 0, 3);
    player.moveTo(20, 0);
    expect(Math.abs(bullet.x - player.x)).toBeGreaterThan(bullet.radius + player.radius);
    expect(checkCollision(bullet, player)).toBe(true);
  });

  test('dead 弹幕不参与结算，且不影响同帧其他弹幕', () => {
    const dead = new Bullet(0, 0, 0, 0, 5);
    dead.dead = true;
    const live = new Bullet(-30, 0, 100, 0, 2);
    const player = new Hitbox(20, 0, 3);
    player.hp = 5;
    live.update(1);
    const result = resolveCollisions([dead, live], player, 1);
    expect(result.hits).toBe(1);
    expect(player.hp).toBe(4);
  });
});
