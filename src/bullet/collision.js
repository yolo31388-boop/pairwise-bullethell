// 弹幕-玩家碰撞检测。
//
// 不变量：
// 1. 圆形弹幕（点弹/大弹）使用扫掠圆检测：弹幕移动线段(prev->cur) 对
//    玩家移动线段(prev->cur) 的相对运动线段，与半径和做线段-圆求交，
//    绝不能只比较两个帧末位置（高速弹会隧穿，已离开的位置会误判）。
// 2. 碰撞时间 t 精确求根，取本帧内最早相交的时间点（t ∈ [0,1]）。
// 3. 激光使用线段-玩家（扫掠）距离判定，伤害由结算函数按帧结算。
// 4. 擦弹只在命中环外、擦弹环内触发，命中与擦弹不重叠。
// 5. 几何判定不关心无敌帧；伤害结算（settle）才检查 invincible，
//    无敌期间弹幕照常移动、存活、穿过玩家。

const DEFAULT_GRAZE_RANGE = 14;

function playerSnapshot(player) {
  const hb = typeof player.getHitbox === 'function' ? player.getHitbox() : player;
  return {
    x: hb.x,
    y: hb.y,
    radius: hb.radius,
    prevX: player.prevX != null ? player.prevX : hb.x,
    prevY: player.prevY != null ? player.prevY : hb.y,
  };
}

function bulletSegment(bullet) {
  return {
    x1: bullet.prevX != null ? bullet.prevX : bullet.x,
    y1: bullet.prevY != null ? bullet.prevY : bullet.y,
    x2: bullet.x,
    y2: bullet.y,
  };
}

function dot(ax, ay, bx, by) {
  return ax * bx + ay * by;
}

// 点到线段距离的平方
function pointSegmentDist2(px, py, x1, y1, x2, y2) {
  const sx = x2 - x1;
  const sy = y2 - y1;
  const len2 = sx * sx + sy * sy;
  let t = 0;
  if (len2 > 0) {
    t = dot(px - x1, py - y1, sx, sy) / len2;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
  }
  const cx = x1 + sx * t;
  const cy = y1 + sy * t;
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy;
}

// 两条线段之间的最小距离（采样上的解析极小值：端点到另一线段 + 交点 0）
function segmentSegmentDist2(a, b) {
  function cross(ax, ay, bx, by) {
    return ax * by - ay * bx;
  }
  const rx = a.x2 - a.x1;
  const ry = a.y2 - a.y1;
  const sx = b.x2 - b.x1;
  const sy = b.y2 - b.y1;
  const denom = cross(rx, ry, sx, sy);
  const qpx = b.x1 - a.x1;
  const qpy = b.y1 - a.y1;
  if (denom !== 0) {
    const t = cross(qpx, qpy, sx, sy) / denom;
    const u = cross(qpx, qpy, rx, ry) / denom;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return 0;
  }
  let d = pointSegmentDist2(a.x1, a.y1, b.x1, b.y1, b.x2, b.y2);
  d = Math.min(d, pointSegmentDist2(a.x2, a.y2, b.x1, b.y1, b.x2, b.y2));
  d = Math.min(d, pointSegmentDist2(b.x1, b.y1, a.x1, a.y1, a.x2, a.y2));
  d = Math.min(d, pointSegmentDist2(b.x2, b.y2, a.x1, a.y1, a.x2, a.y2));
  return d;
}

// 扫掠圆：弹幕圆与玩家圆在本帧相对运动中的最早碰撞时间。
// 返回 { hit, time, distance }；time ∈ [0,1]，0 表示帧起点已重叠。
function sweptCircleTime(bullet, player) {
  const p = playerSnapshot(player);
  const b = bulletSegment(bullet);

  // 相对位移：在玩家静止于帧起点的参考系中，弹幕的运动线段
  const bx1 = b.x1 - p.prevX;
  const by1 = b.y1 - p.prevY;
  const dx = (b.x2 - b.x1) - (p.x - p.prevX);
  const dy = (b.y2 - b.y1) - (p.y - p.prevY);
  const r = bullet.radius + p.radius;

  const A = dx * dx + dy * dy;
  const B = 2 * dot(bx1, by1, dx, dy);
  const C = bx1 * bx1 + by1 * by1 - r * r;

  // 帧起点已经重叠 -> 最早时间为 0
  if (C <= 0) {
    return { hit: true, time: 0, distance: Math.sqrt(Math.max(0, bx1 * bx1 + by1 * by1)) };
  }

  if (A === 0) {
    // 两者均静止且不重叠
    return { hit: false, time: null, distance: Math.sqrt(C + r * r) };
  }

  const disc = B * B - 4 * A * C;
  if (disc < 0) {
    // 整条相对运动线段都在碰撞半径外，返回最近距离供擦弹使用
    const tClosest = Math.min(1, Math.max(0, -B / (2 * A)));
    const cx = bx1 + dx * tClosest;
    const cy = by1 + dy * tClosest;
    return { hit: false, time: null, distance: Math.sqrt(cx * cx + cy * cy) };
  }

  const t = (-B - Math.sqrt(disc)) / (2 * A);
  if (t >= 0 && t <= 1) {
    const cx = bx1 + dx * t;
    const cy = by1 + dy * t;
    return { hit: true, time: t, distance: Math.sqrt(cx * cx + cy * cy) };
  }
  const tClosest = Math.min(1, Math.max(0, -B / (2 * A)));
  const cx = bx1 + dx * tClosest;
  const cy = by1 + dy * tClosest;
  return { hit: false, time: null, distance: Math.sqrt(cx * cx + cy * cy) };
}

function isLaser(bullet) {
  return bullet.type === 'laser' || (bullet.x1 != null && bullet.y1 != null && bullet.x2 != null && bullet.y2 != null);
}

// 激光（有宽度线段）对玩家扫掠路径的最小距离
function laserDistance(bullet, player) {
  const p = playerSnapshot(player);
  const playerPath = { x1: p.prevX, y1: p.prevY, x2: p.x, y2: p.y };
  const cur = { x1: bullet.x1, y1: bullet.y1, x2: bullet.x2, y2: bullet.y2 };
  let d2 = segmentSegmentDist2(cur, playerPath);
  if (bullet.prevX1 != null) {
    const prev = { x1: bullet.prevX1, y1: bullet.prevY1, x2: bullet.prevX2, y2: bullet.prevY2 };
    d2 = Math.min(d2, segmentSegmentDist2(prev, playerPath));
  }
  return Math.sqrt(d2);
}

// 公开用途保持不变：本帧是否发生几何碰撞（与无敌帧无关）。
function checkCollision(bullet, player) {
  if (isLaser(bullet)) {
    if (bullet.active === false) return false;
    const halfWidth = bullet.width != null ? bullet.width / 2 : bullet.radius || 0;
    const p = playerSnapshot(player);
    return laserDistance(bullet, player) <= halfWidth + p.radius;
  }
  return sweptCircleTime(bullet, player).hit;
}

// 返回最早碰撞时间 t ∈ [0,1]；未碰撞返回 null。
function getCollisionTime(bullet, player) {
  if (isLaser(bullet)) {
    return checkCollision(bullet, player) ? 0 : null;
  }
  const result = sweptCircleTime(bullet, player);
  return result.hit ? result.time : null;
}

// 公开用途保持不变：本帧是否擦弹（命中环外、擦弹环内，二者不重叠）。
function checkGraze(bullet, player) {
  if (isLaser(bullet)) return false;
  const result = sweptCircleTime(bullet, player);
  if (result.hit) return false;
  const p = playerSnapshot(player);
  const grazeRange = player.grazeRange != null ? player.grazeRange : DEFAULT_GRAZE_RANGE;
  return result.distance < bullet.radius + p.radius + grazeRange;
}

// 单发弹幕结算：激光按帧造成持续伤害且不消失；普通弹命中即 dead，
// 未命中则判定擦弹；无敌帧期间免疫伤害，弹幕继续移动、存活。
// 返回 'hit' | 'graze' | null。
function settle(bullet, player) {
  if (bullet.dead) return null;

  if (isLaser(bullet)) {
    if (bullet.active === false) return null;
    if (!checkCollision(bullet, player)) return null;
    if (typeof player.takeDamage === 'function') {
      if (!player.takeDamage(1)) return null;
    } else if (player.invincible > 0) {
      return null;
    }
    return 'hit';
  }

  const result = sweptCircleTime(bullet, player);
  if (result.hit) {
    const damaged = typeof player.takeDamage === 'function' ? player.takeDamage(1) : true;
    if (damaged) {
      bullet.dead = true;
      return 'hit';
    }
    // 无敌中：免疫所有伤害，弹幕不消失、不标记、继续存在
    return null;
  }

  if (checkGraze(bullet, player)) {
    bullet.grazed = true;
    return 'graze';
  }
  return null;
}

// 同一帧内逐弹结算：每发弹幕独立判定，绝不合并或丢失。
// 返回 { hits, grazes, dead }。
function settleFrame(bullets, player) {
  let hits = 0;
  let grazes = 0;
  const dead = [];
  for (const bullet of bullets) {
    const outcome = settle(bullet, player);
    if (outcome === 'hit') {
      hits += 1;
      if (bullet.dead) dead.push(bullet);
    } else if (outcome === 'graze') {
      grazes += 1;
    }
  }
  return { hits, grazes, dead };
}

module.exports = {
  checkCollision,
  checkGraze,
  getCollisionTime,
  settle,
  settleFrame,
  sweptCircleTime,
  laserDistance,
  pointSegmentDist2,
  segmentSegmentDist2,
};
