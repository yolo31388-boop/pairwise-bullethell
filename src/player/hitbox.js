class Hitbox {
  constructor(x, y, radius, visualRadius) {
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.radius = radius;
    this.visualRadius = visualRadius != null ? visualRadius : radius * 2;
    this.invincible = 0;
    this.vx = 0;
    this.vy = 0;
    this.hp = 1;
    this.grazeCount = 0;
  }

  setVelocity(vx, vy) {
    this.vx = vx;
    this.vy = vy;
  }

  moveTo(x, y) {
    this.prevX = this.x;
    this.prevY = this.y;
    this.x = x;
    this.y = y;
  }

  update(dt) {
    this.prevX = this.x;
    this.prevY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.invincible > 0) this.invincible = Math.max(0, this.invincible - dt);
  }

  getHitbox() {
    return {
      x: this.x,
      y: this.y,
      prevX: this.prevX,
      prevY: this.prevY,
      radius: this.radius,
    };
  }

  isInvincible() {
    return this.invincible > 0;
  }

  takeDamage(amount) {
    if (this.isInvincible()) return false;
    this.hp -= amount;
    return true;
  }

  addGraze() {
    this.grazeCount += 1;
  }
}

class Player extends Hitbox {
  constructor(x, y, hitRadius, visualRadius) {
    super(x, y, hitRadius, visualRadius != null ? visualRadius : hitRadius * 3);
  }
}

module.exports = { Hitbox, Player };
