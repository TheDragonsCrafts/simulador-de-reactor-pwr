import { test, describe } from 'node:test';
import assert from 'node:assert';
import { formatRadiation } from './sim';

describe('formatRadiation', () => {
  test('formats values less than 1 correctly (uSv/h)', () => {
    assert.strictEqual(formatRadiation(0.5), '500 uSv/h');
    assert.strictEqual(formatRadiation(0.123), '123 uSv/h');
    assert.strictEqual(formatRadiation(0.001), '1 uSv/h');
  });

  test('rounds values less than 1 correctly', () => {
    assert.strictEqual(formatRadiation(0.5555), '556 uSv/h');
    assert.strictEqual(formatRadiation(0.5554), '555 uSv/h');
  });

  test('formats values greater than or equal to 1 correctly (mSv/h)', () => {
    assert.strictEqual(formatRadiation(1.0), '1.0 mSv/h');
    assert.strictEqual(formatRadiation(5.5), '5.5 mSv/h');
    assert.strictEqual(formatRadiation(120.45), '120.5 mSv/h');
  });

  test('handles boundary conditions correctly', () => {
    assert.strictEqual(formatRadiation(0), '0 uSv/h');
    assert.strictEqual(formatRadiation(0.999), '999 uSv/h');
    assert.strictEqual(formatRadiation(0.9999), '1000 uSv/h'); // Rounding makes it 1000 uSv/h because it is still < 1
    assert.strictEqual(formatRadiation(1), '1.0 mSv/h');
  });
});
