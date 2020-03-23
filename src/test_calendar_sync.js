// ----------------------- TESTING -----------------------
function tester() {
  const sheetLog = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('logger');
  sheetLog.getRange('A4').setValue('goalMapper:');
  sheetLog.getRange('B4').setValue(JSON.stringify(sundaysInMonth('2020-03-01')));
}
// Logger.log(`goalMap: ${JSON.stringify(goalMap)}`);
// sheetLog.getRange('A2').setValue('data:');
// sheetLog.getRange('B2').setValue(JSON.stringify(data));
// const breaker = true;
// if (breaker) return;
// ----------------------------------------------------

// const dummyData = [
//   ['Month', 'Name', 'Units', 'Goal', 'Reached', 'Description', 'id'],
//   [3, 'Easy Challenges', '#', 20, '', 'HackerRank, LeetCode', ''],
//   [3, 'Medium Challenges', '#', 10, '', 'HackerRank, LeetCode', ''],
//   [3, 'App 1: Node/React', '%', 1, '', '', ''],
//   [4, 'Easy Challenges', '#', 20, '', 'HackerRank, LeetCode', ''],
//   [4, 'Medium Challenges', '#', 15, '', 'HackerRank, LeetCode', '']
// ];
// const a = goalMapper(dummyData);
// console.log(a);
// const sundays = sundaysInMonth(`2020-03-01`);
// console.log(`sundays: ${sundays}`);

// ----------------------- TESTING Variables -----------------------
// const a = sundaysInMonth('2020-03-01');
// console.log(a);
// const b = new Date(a[1]);
// console.log(b);

const sheetLog = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('logger');
sheetLog.getRange('A5').setValue('testDates:');
sheetLog.getRange('B5').setValue(JSON.stringify(testDates));

// ADD EVENT SNIPPET
// const newEvent = calendar.createAllDayEvent('Weekly Goals', new Date(sunday), {
//   description: weeklyGoals[sunday].join('\n')
// });
// newEvent.setColor('10');
