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
// Get calendar and events
const calendar = CalendarApp.getAllOwnedCalendars()[0];
const newEvent = calendar.createAllDayEvent('Weekly Goals', new Date(sunday), {
  description: weeklyGoals[sunday].join('\n')
});
newEvent.setColor('10');

// to be used
function getCompletedTasks(taskListId) {
  const optionalArgs = {
    maxResults: 100,
    showHidden: true
  };
  const tasks = Tasks.Tasks.list(taskListId, optionalArgs);
  const SPREADSHEET = SpreadsheetApp.getActiveSpreadsheet();
  const rngStartReport = SPREADSHEET.getRange('A1');
  let k = 0;
  if (tasks.items) {
    for (let i = 0; i < tasks.items.length; i++) {
      const task = tasks.items[i];
      rngStartReport.offset(k, 0).setValue(task.title);
      rngStartReport.offset(k, 1).setValue(task.status);
      k++;
      Logger.log('Task with title "%s" and ID "%s" was found.', task.title, task.id);
    }
  } else {
    Logger.log('No tasks found.');
  }
}

function temp() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('GoalsTemp');
  const range = sheet.getDataRange();
  const data = range.getValues();

  const goalMap = monthlyGoalMapper(data);

  const taskList = getTaskLists().find(list => list.name === 'Goals');

  goalMap['2020-03-01'].forEach(entry => {
    Utilities.sleep(500);
    addTask(
      `${entry.name}: ${entry.goal}${entry.units} `,
      new Date('2020-03-24'),
      'you can do it!',
      taskList
    );
  });
}
