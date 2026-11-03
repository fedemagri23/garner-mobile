import { sizeClassOf } from '../use-layout';

it('sorts windows by width, at the breakpoints', () => {
  expect(sizeClassOf(280)).toBe('compact');
  expect(sizeClassOf(599)).toBe('compact');
  expect(sizeClassOf(600)).toBe('medium');
  expect(sizeClassOf(1023)).toBe('medium');
  expect(sizeClassOf(1024)).toBe('expanded');
  expect(sizeClassOf(2560)).toBe('expanded');
});
