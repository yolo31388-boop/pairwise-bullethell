const { Bullet, Laser } = require('../src/bullet/bullet.js');
const { Hitbox } = require('../src/player/hitbox.js');
const {
  checkCollision,
  checkGraze,
  getCollisionTime,
  settle,
  settleFrame,
} = require('../src/bullet/collision.js');

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

describe('扫掠碰撞不变量', () => {
  test('高速弹幕一帧穿过玩家也必须命中（帧末位置法会漏判）', () => {
    const bullet = new Bullet(-10, 0, 200, 0, 1);
    const player = new Hitbox(50, 0, 3);
    bullet.update(1);
    // 帧末距离 140，旧实现漏判；扫掠路径在帧内经过玩家
    expect(Math.hypot(bullet.x - player.x, bullet.y - player.y)).toBeGreaterThan(bullet.radius + player.radius);
    expect(checkCollision(bullet, player)).toBe(true);
  });

  test('碰撞时间取两条移动线段最早相交点（精确值）', () => {
    const bullet = new Bullet(0, 0, 100, 0, 2);
    const player = new Hitbox(50, 0, 3);
    bullet.update(1);
    expect(getCollisionTime(bullet, player)).toBeCloseTo(0.45, 10);
  });

  test('两条移动线段空间相交但时间错位时不碰撞', () => {
    // 弹幕沿 y=0 从 x=0 到 x=100；玩家沿 x=50 从 y=50 到 y=0，
    // 两条线段在 (50,0) 空间相交，但弹幕经过 x=50 时玩家还在 y=25。
    const bullet = new Bullet(0, 0, 100, 0, 2);
    const player = new Hitbox(50, 50, 3, { vy: -50 });
    bullet.update(1);
    player.update(1);
    expect(checkCollision(bullet, player)).toBe(false);
    expect(getCollisionTime(bullet, player)).toBeNull();
  });

  test('玩家移动撞向静止弹幕必须命中（帧末位置法会漏判）', () => {
    const bullet = new Bullet(0, 10, 0, 0, 2);
    const player = new Hitbox(0, 0, 3, { vy: 100 });
    bullet.update(1);
    player.update(1);
    expect(getCollisionTime(bullet, player)).toBeCloseTo(0.05, 10);
    expect(checkCollision(bullet, player)).toBe(true);
  });

  test('玩家移动远离弹幕时不会误判', () => {
    const bullet = new Bullet(0, 10, 0, 0, 2);
    const player = new Hitbox(0, 0, 3, { vy: -100 });
    bullet.update(1);
    player.update(1);
    expect(checkCollision(bullet, player)).toBe(false);
  });

  test('无敌帧期间免疫伤害，弹幕继续移动且不消失', () => {
    const bullet = new Bullet(-20, 0, 100, 0, 3);
    const player = new Hitbox(0, 0, 3, { invincible: 1, hp: 5 });
    bullet.update(1); // 帧内扫过玩家
    expect(settle(bullet, player)).toBeNull();
    expect(bullet.dead).toBe(false);
    expect(player.hp).toBe(5);
    expect(bullet.x).toBe(80); // 弹幕照常移动、继续存在
  });

  test('无敌结束后穿过玩家的弹幕照常造成伤害', () => {
    const bullet = new Bullet(0, 0, 0, 0, 5);
    const player = new Hitbox(0, 0, 5, { invincible: 1, hp: 5 });
    expect(settle(bullet, player)).toBeNull();
    expect(bullet.dead).toBe(false);
    player.update(1.1);
    expect(settle(bullet, player)).toBe('hit');
    expect(bullet.dead).toBe(true);
    expect(player.hp).toBe(4);
  });

  test('命中的弹幕立即 dead，不能二次结算', () => {
    const bullet = new Bullet(0, 0, 0, 0, 5);
    const player = new Hitbox(0, 0, 5, { hp: 9 });
    expect(settle(bullet, player)).toBe('hit');
    expect(bullet.dead).toBe(true);
    expect(settle(bullet, player)).toBeNull();
    expect(player.hp).toBe(8);
  });

  test('同一帧多发弹幕分别结算，不合并不丢失', () => {
    const bullets = [
      new Bullet(-10, 0, 200, 0, 1),
      new Bullet(-10, 2, 200, 0, 1),
      new Bullet(-10, -2, 200, 0, 1),
    ];
    const player = new Hitbox(50, 0, 3, { hp: 9 });
    bullets.forEach((b) => b.update(1));
    const result = settleFrame(bullets, player);
    expect(result.hits).toBe(3);
    expect(bullets.every((b) => b.dead)).toBe(true);
  });

  test('同帧命中与擦弹分别计数', () => {
    const bullets = [
      new Bullet(-10, 0, 200, 0, 1),
      new Bullet(-10, 2, 200, 0, 1),
      new Bullet(-10, 10, 200, 0, 1),
    ];
    const player = new Hitbox(50, 0, 3, { hp: 9 });
    bullets.forEach((b) => b.update(1));
    const result = settleFrame(bullets, player);
    expect(result.hits).toBe(2);
    expect(result.grazes).toBe(1);
  });

  test('受击盒基于实际受击范围而非整个精灵盒', () => {
    const player = new Hitbox(0, 0, 3, { visualRadius: 16 });
    expect(player.getHitbox().radius).toBe(3);
    expect(player.visualRadius).toBeGreaterThan(player.getHitbox().radius);
    const bullet = new Bullet(0, 10, 0, 0, 2); // 在视觉范围内但在受击范围外
    expect(checkCollision(bullet, player)).toBe(false);
  });

  test('点弹与大弹拥有不同碰撞体积', () => {
    const point = new Bullet(0, 0, 0, 0, 2, 'point');
    const large = new Bullet(0, 0, 0, 0, 2, 'large');
    expect(large.radius).toBeGreaterThan(point.radius);
    const player = new Hitbox(0, 5, 1);
    expect(checkCollision(point, player)).toBe(false); // 2+1=3 < 5
    expect(checkCollision(large, player)).toBe(true);  // 8+1=9 > 5
  });

  test('激光用线段-玩家判定，玩家帧内穿过光束时命中（帧末法漏判）', () => {
    const laser = new Laser(-100, 0, 100, 0, 2, true);
    const player = new Hitbox(0, 50, 3, { vy: -200 });
    player.update(1); // 帧末在 (0,-150)，已远离光束，但帧内穿过 y=0
    expect(Math.abs(player.y)).toBeGreaterThan(50);
    expect(checkCollision(laser, player)).toBe(true);
    laser.active = false;
    expect(checkCollision(laser, player)).toBe(false);
  });

  test('激光持续伤害按帧结算且激光不消失', () => {
    const laser = new Laser(-100, 0, 100, 0, 10, true);
    const player = new Hitbox(0, 0, 3, { hp: 3 });
    expect(settle(laser, player)).toBe('hit');
    expect(settle(laser, player)).toBe('hit');
    expect(player.hp).toBe(1);
    expect(laser.dead).toBe(false);
    expect(laser.active).toBe(true);
  });

  test('激光在无敌帧期间不造成伤害，结束后恢复', () => {
    const laser = new Laser(-100, 0, 100, 0, 10, true);
    const player = new Hitbox(0, 0, 3, { hp: 3, invincible: 1 });
    expect(settle(laser, player)).toBeNull();
    expect(player.hp).toBe(3);
    player.update(1.1);
    expect(settle(laser, player)).toBe('hit');
    expect(player.hp).toBe(2);
  });

  test('擦弹在命中环外、擦弹环内触发', () => {
    const player = new Hitbox(0, 0, 3);
    const grazing = new Bullet(0, 12, 0, 0, 2); // 12 ∈ (5, 19]
    expect(checkCollision(grazing, player)).toBe(false);
    expect(checkGraze(grazing, player)).toBe(true);
    const outside = new Bullet(0, 100, 0, 0, 2);
    expect(checkGraze(outside, player)).toBe(false);
  });

  test('命中与擦弹判定不重叠', () => {
    const bullet = new Bullet(0, 0, 100, 0, 2);
    const player = new Hitbox(50, 0, 3);
    bullet.update(1);
    expect(checkCollision(bullet, player)).toBe(true);
    expect(checkGraze(bullet, player)).toBe(false);
  });
});
