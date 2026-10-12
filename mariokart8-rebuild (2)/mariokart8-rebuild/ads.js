// ads disabled in local rebuild
export function adFrame(ww, wh) {
  return { x: 0, y: 0, w: ww, h: wh, left: 0, right: 0, top: 0, bottom: 0 };
}
export function adGutter() {
  document.querySelectorAll('.ad-gutter, .ad-row, .ad-slot, .ad-tile').forEach((el) => el.remove());
  return { narrow: () => {}, hide: () => {} };
}
