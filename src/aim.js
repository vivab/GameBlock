// Keep recoil compensation responsive even while the shoot button is held.
export function rotateAim(yaw,pitch,deltaX,deltaY,sensitivity=0.004){
  if(![yaw,pitch,deltaX,deltaY,sensitivity].every(Number.isFinite))
    return {yaw,pitch};
  return {
    yaw:yaw-deltaX*sensitivity,
    pitch:Math.max(-1.2,Math.min(1.2,pitch-deltaY*sensitivity)),
  };
}
