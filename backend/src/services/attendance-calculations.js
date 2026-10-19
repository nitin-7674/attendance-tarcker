function percentage(numerator, denominator) {
  if (denominator === 0) return null;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function actualAttendance(present, absent) {
  return percentage(present, present + absent);
}

function adjustedAttendance(present, absent, dutyLeaveCredits) {
  return percentage(present + dutyLeaveCredits, present + absent);
}

function periodsNeededForTarget(present, absent, target) {
  if (target === 100) return absent > 0 ? null : 0;
  return Math.max(
    0,
    Math.ceil((target * (present + absent) - 100 * present) / (100 - target)),
  );
}

function absenceAllowance(present, absent, target) {
  if (target <= 0) return null;
  return Math.max(0, Math.floor((100 * present) / target - (present + absent)));
}

module.exports = {
  absenceAllowance,
  actualAttendance,
  adjustedAttendance,
  periodsNeededForTarget,
};
