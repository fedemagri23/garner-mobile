import { frameWidthFor } from '../barcode-scanner';

it('sizes the frame to the screen, within limits', () => {
  // An ordinary phone: close to the old fixed 260 wide.
  expect(frameWidthFor(390, 844)).toBe(281);
  // The narrowest: it still fits, with room at the sides.
  expect(frameWidthFor(280, 560)).toBe(202);
  // A short window: the height decides, so the field stays on screen.
  expect(frameWidthFor(1024, 400)).toBe(208);
  // A very large screen: a barcode does not need more.
  expect(frameWidthFor(2560, 1440)).toBe(420);
});
