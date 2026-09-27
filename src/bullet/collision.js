const GRAZE_RANGE = 12;
const EPS = 1e-9;

function asCircle(obj) {
  if (obj && typeof obj.getHitbox === 'function') {
    const h = obj.getHitbox();
    return {
      x: h.x,
      y: h.y,
      prevX: h.prevX != null ? h.prevX : h.x,
      prevY: h.prevY != null ? h.prevY : h.y,
      radius: h.radius,
    };
  }
  return {
    x: obj.x,
    y: obj.y,
    prevX: obj.prevX != null ? obj.prevX : obj.x,
    prevY: obj.prevY != null ? obj.prevY : obj.y,
    radius: obj.radius,
  };
}

// Smallest t in [lo, hi] at which a t^2 + b t + c <= limit.
function firstQuadraticRoot(a, b, c, lo, hi, limit) {
  if (Math.abs(a) < EPS) {
    if (Math.abs(b) < EPS) {
      if (c <= limit + EPS) return lo;
      return null;
    }
    const t = (limit - c) / b;
    if (t >= lo - EPS && t <= hi + EPS) return Math.max(lo, Math.min(hi, t));
    return null;
  }
  const disc = b * b - 4 * a * (c - limit);
  if (disc < -EPS) return null;
  const sq = Math.sqrt(Math.max(0, disc));
  const t1 = (-b - sq) / (2 * a);
  const t2 = (-b + sq) / (2 * a);
  const candidates = [t1, t2].sort((p, q) => p - q);
  for (const t of candidates) {
    if (t >= lo - EPS && t <= hi + EPS) return Math.max(lo, Math.min(hi, t));
  }
  return null;
}

// Normalized time t in [0,1] at which two moving circles first overlap.
function circleSweepTime(b, p) {
  const rx = b.prevX - p.prevX;
  const ry = b.prevY - p.prevY;
  const dvx = (b.x - b.prevX) - (p.x - p.prevX);
  const dvy = (b.y - b.prevY) - (p.y - p.prevY);
  const limit = b.radius + p.radius;
  if (rx * rx + ry * ry <= (limit + EPS) * (limit + EPS)) return 0;
  const a = dvx * dvx + dvy * dvy;
  const bb = 2 * (rx * dvx + ry * dvy);
  const c = rx * rx + ry * ry;
  return firstQuadraticRoot(a, bb, c, 0, 1, limit * limit);
}

// Squared distance from point to an axis-aligned-free segment.
function pointSegDist2(px, py, ax, ay, bx, by) {
  const sx = bx - ax;
  const sy = by - ay;
  const len2 = sx * sx + sy * sy;
  if (len2 < EPS) {
    const dx = px - ax;
    const dy = py - ay;
    return dx * dx + dy * dy;
  }
  let u = ((px - ax) * sx + (py - ay) * sy) / len2;
  u = Math.max(0, Math.min(1, u));
  const cx = ax + u * sx;
  const cy = ay + u * sy;
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy;
}

// Normalized time t in [0,1] at which a swept laser segment (its two
// endpoints may move independently: translation, rotation, scaling) first
// touches the moving player circle. The point-segment distance along the
// frame is a continuous piecewise-smooth quartic; we bisect each sign change
// over a dense partition, which returns the earliest contact accurately.
function laserSweepTime(laser, p, width) {
  const limit = width / 2 + p.radius;
  const limit2 = limit * limit;
  const ax0 = laser.prevX1;
  const ay0 = laser.prevY1;
  const ax1 = laser.x1;
  const ay1 = laser.y1;
  const bx0 = laser.prevX2;
  const by0 = laser.prevY2;
  const bx1 = laser.x2;
  const by1 = laser.y2;

  function gap2(t) {
    const ax = ax0 + (ax1 - ax0) * t;
    const ay = ay0 + (ay1 - ay0) * t;
    const bx = bx0 + (bx1 - bx0) * t;
    const by = by0 + (by1 - by0) * t;
    const px = p.prevX + (p.x - p.prevX) * t;
    const py = p.prevY + (p.y - p.prevY) * t;
    return pointSegDist2(px, py, ax, ay, bx, by);
  }

  if (gap2(0) <= limit2 + EPS) return 0;

  const PARTITIONS = 64;
  let prev = gap2(0) - limit2;
  for (let i = 1; i <= PARTITIONS; i++) {
    const t = i / PARTITIONS;
    const cur = gap2(t) - limit2;
    if (cur <= EPS) {
      let lo = (i - 1) / PARTITIONS;
      let hi = t;
      for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2;
        if (gap2(mid) - limit2 <= 0) hi = mid;
        else lo = mid;
      }
      return hi;
    }
    prev = cur;
  }
  return null;
}

function getCollisionTime(bullet, player) {
  const p = asCircle(player);
  if (bullet && bullet.type === 'laser') {
    if (bullet.active === false) return null;
    return laserSweepTime(bullet, p, bullet.width != null ? bullet.width : bullet.radius * 2);
  }
  const b = asCircle(bullet);
  return circleSweepTime(b, p);
}

function minCircleSegmentGap2(b, p) {
  // Analytic minimum of the relative motion segment's distance over t in
  // [0,1], minus the combined hit radii. Negative means an actual hit.
  const rx = b.prevX - p.prevX;
  const ry = b.prevY - p.prevY;
  const dvx = (b.x - b.prevX) - (p.x - p.prevX);
  const dvy = (b.y - b.prevY) - (p.y - p.prevY);
  const limit = b.radius + p.radius;
  const v2 = dvx * dvx + dvy * dvy;
  let t = 0;
  if (v2 > EPS) t = Math.max(0, Math.min(1, -(rx * dvx + ry * dvy) / v2));
  const dx = rx + dvx * t;
  const dy = ry + dvy * t;
  return dx * dx + dy * dy - limit * limit;
}

// Public pure geometric predicate: swept segment / segment (circle-swept
// circle) test over the whole frame. Returns true only on an actual hit.
function checkCollision(bullet, player) {
  return getCollisionTime(bullet, player) != null;
}

// Graze is exclusive with hit: the paths must miss the hit radii but enter
// the graze band. Each bullet grazes at most once.
function checkGraze(bullet, player) {
  if (bullet && bullet.type === 'laser') return false;
  const p = asCircle(player);
  const b = asCircle(bullet);
  if (checkCollision(bullet, player)) return false;
  if (bullet.grazed) return false;
  const hitLimit = b.radius + p.radius;
  const grazeOuter2 = (hitLimit + GRAZE_RANGE) * (hitLimit + GRAZE_RANGE) - hitLimit * hitLimit;
  const gap2 = minCircleSegmentGap2(b, p);
  if (gap2 >= -EPS && gap2 <= grazeOuter2 + EPS) {
    bullet.grazed = true;
    return true;
  }
  return false;
}

// Engine boundary: resolve every bullet independently in the same frame.
// Invincibility immunizes all damage while bullets keep moving and existing;
// hit bullets are marked dead immediately so they cannot hit twice.
function resolveCollisions(bullets, player, dt) {
  const result = { hits: 0, damage: 0, grazes: 0, deadBullets: [] };
  for (const bullet of bullets) {
    if (!bullet || bullet.dead) continue;

    if (checkGraze(bullet, player)) {
      result.grazes += 1;
      if (typeof player.addGraze === 'function') player.addGraze();
    }

    if (!checkCollision(bullet, player)) continue;
    if (typeof player.isInvincible === 'function' && player.isInvincible()) continue;
    if (player.invincible > 0) continue;

    const damage = bullet.type === 'large' ? 2 : 1;
    if (typeof player.takeDamage === 'function') {
      if (!player.takeDamage(damage)) continue;
    } else {
      player.hp = (player.hp || 1) - damage;
    }

    result.hits += 1;
    result.damage += damage;
    if (bullet.type !== 'laser') {
      bullet.dead = true;
      result.deadBullets.push(bullet);
    }
  }
  return result;
}

// Absolute time (seconds) of first contact within the frame, or null.
function getCollisionTimeSeconds(bullet, player, dt) {
  const t = getCollisionTime(bullet, player);
  return t == null ? null : t * dt;
}

module.exports = {
  checkCollision,
  checkGraze,
  resolveCollisions,
  getCollisionTime,
  getCollisionTimeSeconds,
  GRAZE_RANGE,
};
