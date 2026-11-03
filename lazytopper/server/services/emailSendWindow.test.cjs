// EMAIL-SEND-WINDOW-1 - the shared IST send window: boundaries (across the UTC date line), env parse.
const test = require('node:test');
const assert = require('node:assert/strict');
const { isWithinSendWindow, istHour, parseSendWindow, resolveSendWindow } = require('./emailSendWindow.cjs');

// IST = UTC+5:30. Build an instant from an IST wall-clock time.
const ist = (date, hhmm) => Date.parse(`${date}T${hhmm}:00+05:30`);

test('default window is 08:00 <= IST time < 21:00 (boundaries)', () => {
  assert.equal(isWithinSendWindow(ist('2026-11-04', '07:59')), false);
  assert.equal(isWithinSendWindow(ist('2026-11-04', '08:00')), true);
  assert.equal(isWithinSendWindow(ist('2026-11-04', '20:59')), true);
  assert.equal(isWithinSendWindow(ist('2026-11-04', '21:00')), false);
  assert.equal(isWithinSendWindow(ist('2026-11-04', '00:30')), false);
});

test('works across the UTC date line (IST 00:30-05:29 is still the previous UTC day)', () => {
  const t = ist('2026-11-04', '01:00'); // 2026-11-03T19:30Z
  assert.equal(new Date(t).toISOString(), '2026-11-03T19:30:00.000Z');
  assert.equal(istHour(t), 1);
  assert.equal(isWithinSendWindow(t), false);
  const eight = Date.parse('2026-11-04T02:30:00Z'); // 08:00 IST, same UTC day
  assert.equal(isWithinSendWindow(eight), true);
  assert.equal(isWithinSendWindow(eight - 1), false);
  const nine = Date.parse('2026-11-04T15:30:00Z'); // 21:00 IST
  assert.equal(isWithinSendWindow(nine), false);
  assert.equal(isWithinSendWindow(nine - 1), true);
});

test('env override parse: "8-21" style, invalid falls back to default and logs once', () => {
  assert.deepEqual(parseSendWindow('9-18'), { startHour: 9, endHour: 18, valid: true });
  assert.deepEqual(parseSendWindow(' 0 - 24 '), { startHour: 0, endHour: 24, valid: true });
  assert.equal(parseSendWindow(undefined).valid, true);
  assert.equal(parseSendWindow('').valid, true);
  for (const bad of ['21-8', '8-8', '8-25', 'abc', '8', '8-21-3', '-1-5']) {
    const p = parseSendWindow(bad);
    assert.equal(p.valid, false, bad);
    assert.equal(p.startHour, 8);
    assert.equal(p.endHour, 21);
  }
  const logs = [];
  const w = resolveSendWindow({ EMAIL_SEND_WINDOW_IST: 'nonsense-win' }, (l) => logs.push(l));
  resolveSendWindow({ EMAIL_SEND_WINDOW_IST: 'nonsense-win' }, (l) => logs.push(l));
  assert.equal(logs.length, 1);
  assert.match(logs[0], /invalid EMAIL_SEND_WINDOW_IST/);
  assert.equal(w.contains(ist('2026-11-04', '12:00')), true); // sending NOT disabled
  const custom = resolveSendWindow({ EMAIL_SEND_WINDOW_IST: '10-12' }, () => {});
  assert.equal(custom.contains(ist('2026-11-04', '09:59')), false);
  assert.equal(custom.contains(ist('2026-11-04', '10:00')), true);
  assert.equal(custom.contains(ist('2026-11-04', '12:00')), false);
});
