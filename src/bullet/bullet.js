
class Bullet {
  constructor(x, y, vx, vy, radius) { this.x=x; this.y=y; this.vx=vx; this.vy=vy; this.radius=radius; this.dead=false; this.prevX=x; this.prevY=y; }
  update(dt) { this.prevX=this.x; this.prevY=this.y; this.x+=this.vx*dt; this.y+=this.vy*dt; }
}

module.exports = { Bullet };
