
export function checkCollision(bullet, player) {
  // BUG: 只比较帧末位置
  const dx = bullet.x - player.x;
  const dy = bullet.y - player.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  return dist < bullet.radius + player.radius;
}

export function checkGraze(bullet, player) {
  const dx = bullet.x - player.x;
  const dy = bullet.y - player.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  return dist < bullet.radius + player.radius + 10;
}

module.exports = { checkCollision, checkGraze };
