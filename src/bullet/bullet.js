// 弹幕类型：
//  - point：点弹，碰撞体为半径 radius 的圆，移动路径按线段扫掠
//  - large：大弹，碰撞体积更大（按 type 放大），同样为扫掠圆
//  - laser：激光，碰撞体是一条有宽度的线段（固定位置的光束）
const TYPE_LARGE_SCALE = 4;

class Bullet {
  constructor(x, y, vx, vy, radius, type = 'point') {
    this.type = type;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = type === 'large' ? radius * TYPE_LARGE_SCALE : radius;
    this.dead = false;
    this.grazed = false;
    this.prevX = x;
    this.prevY = y;
  }

  // 公开用途保持不变：先记录帧起点，再移动到帧末，
  // 这样碰撞检测可以拿到本帧完整移动线段 prev->cur。
  update(dt) {
    this.prevX = this.x;
    this.prevY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  getSegment() {
    return { x1: this.prevX, y1: this.prevY, x2: this.x, y2: this.y };
  }
}

// 激光：固定（或慢速移动）的有宽度线段，active 时对与线段相交的玩家
// 按帧结算持续伤害；激光没有 dead 概念（除非外部销毁），也不会被擦弹。
class Laser {
  constructor(x1, y1, x2, y2, width = 5, active = true) {
    this.type = 'laser';
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.width = width;
    this.active = active;
    this.x = (x1 + x2) / 2;
    this.y = (y1 + y2) / 2;
    this.prevX1 = x1;
    this.prevY1 = y1;
    this.prevX2 = x2;
    this.prevY2 = y2;
    this.dead = false;
  }

  update(dt, nx1, ny1, nx2, ny2) {
    this.prevX1 = this.x1;
    this.prevY1 = this.y1;
    this.prevX2 = this.x2;
    this.prevY2 = this.y2;
    if (nx1 != null) {
      this.x1 = nx1;
      this.y1 = ny1;
      this.x2 = nx2;
      this.y2 = ny2;
      this.x = (nx1 + nx2) / 2;
      this.y = (ny1 + ny2) / 2;
    }
  }

  getSegment() {
    return { x1: this.x1, y1: this.y1, x2: this.x2, y2: this.y2 };
  }

  getPreviousSegment() {
    return { x1: this.prevX1, y1: this.prevY1, x2: this.prevX2, y2: this.prevY2 };
  }
}

module.exports = { Bullet, Laser, TYPE_LARGE_SCALE };
