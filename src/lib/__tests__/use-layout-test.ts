import { mapHeightFor, sizeClassOf } from '../use-layout';

it('sorts windows by width, at the breakpoints', () => {
  expect(sizeClassOf(280)).toBe('compact');
  expect(sizeClassOf(599)).toBe('compact');
  expect(sizeClassOf(600)).toBe('medium');
  expect(sizeClassOf(1023)).toBe('medium');
  expect(sizeClassOf(1024)).toBe('expanded');
  expect(sizeClassOf(2560)).toBe('expanded');
});

it('gives a map a share of the window, within limits', () => {
  expect(mapHeightFor(400)).toBe(160);
  expect(mapHeightFor(667)).toBe(200);
  expect(mapHeightFor(844)).toBe(253);
  expect(mapHeightFor(1440)).toBe(320);
});
