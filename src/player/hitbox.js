// 玩家受击盒：radius 是实际受击判定（通常远小于视觉精灵），
// visualRadius 只是视觉范围，永远不参与命中判定。
class Hitbox {
  constructor(x, y, radius, opts = {}) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.visualRadius = opts.visualRadius != null ? opts.visualRadius : radius;
    this.invincible = opts.invincible != null ? opts.invincible : 0;
    this.hp = opts.hp != null ? opts.hp : 1;
    this.grazeRange = opts.grazeRange != null ? opts.grazeRange : 14;
    this.vx = opts.vx != null ? opts.vx : 0;
    this.vy = opts.vy != null ? opts.vy : 0;
    this.prevX = x;
    this.prevY = y;
  }

  // 公开用途保持不变：推进一帧，并记录本帧起点（供线段-线段检测使用）。
  update(dt) {
    this.prevX = this.x;
    this.prevY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.invincible > 0) this.invincible = Math.max(0, this.invincible - dt);
  }

  setVelocity(vx, vy) {
    this.vx = vx;
    this.vy = vy;
  }

  setInvincible(time) {
    this.invincible = time;
  }

  takeDamage(amount = 1) {
    if (this.invincible > 0) return false;
    this.hp -= amount;
    return true;
  }

  // 返回真正的受击范围（小圆），而不是整个精灵盒 visualRadius。
  getHitbox() {
    return { x: this.x, y: this.y, radius: this.radius };
  }
}

module.exports = { Hitbox };
