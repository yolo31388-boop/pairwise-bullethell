
class Hitbox {
  constructor(x, y, radius) { this.x=x; this.y=y; this.radius=radius; this.invincible=0; }
  update(dt) { if (this.invincible > 0) this.invincible -= dt; }
}

module.exports = { Hitbox };
