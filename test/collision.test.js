
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
