// World-space camera positions. Cinematic scale, not a physical orbit simulation.
export const EARTH_RADIUS=2;
export const MOON_POSITION=[-1.8,.55,6.1];
export const MOON_RADIUS=.78;
export const CAMERA_POINTS=[[.6,.7,13.8],[-.7,.8,9.2],[1.7,1.1,6.8],[4.3,1,4],[5.6,1.3,.1],[8.8,2.8,-9.8]];
export function phaseAt(p){return p<.24?0:p<.52?1:p<.83?2:3;}
