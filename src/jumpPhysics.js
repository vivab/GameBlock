// Lower than the old GameBlock 5.8 impulse; gravity stays 14 m/s².
// Peak height from a flat platform is 4.2² / (2 * 14) = 0.63 m.
export const JUMP_IMPULSE=4.2;
export const GRAVITY=14;
export function peakJumpHeight(){return JUMP_IMPULSE*JUMP_IMPULSE/(2*GRAVITY)}
