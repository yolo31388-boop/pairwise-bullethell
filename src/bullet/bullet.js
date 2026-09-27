class Bullet {
  constructor(x, y, vx, vy, radius, type) {
    this.type = type || 'point';
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.dead = false;
    this.grazed = false;
  }

  update(dt) {
    this.prevX = this.x;
    this.prevY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  static point(x, y, vx, vy) {
    return new Bullet(x, y, vx, vy, 2, 'point');
  }

  static large(x, y, vx, vy, radius) {
    return new Bullet(x, y, vx, vy, radius || 10, 'large');
  }
}

class Laser {
  constructor(x1, y1, x2, y2, width) {
    this.type = 'laser';
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.prevX1 = x1;
    this.prevY1 = y1;
    this.prevX2 = x2;
    this.prevY2 = y2;
    this.width = width;
    this.radius = width / 2;
    this.vx = 0;
    this.vy = 0;
    this.active = true;
    this.dead = false;
  }

  setVelocity(vx, vy) {
    this.vx = vx;
    this.vy = vy;
  }

  update(dt) {
    this.prevX1 = this.x1;
    this.prevY1 = this.y1;
    this.prevX2 = this.x2;
    this.prevY2 = this.y2;
    const dx = this.vx * dt;
    const dy = this.vy * dt;
    this.x1 += dx;
    this.y1 += dy;
    this.x2 += dx;
    this.y2 += dy;
  }
}

module.exports = { Bullet, Laser };
