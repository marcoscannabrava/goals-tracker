const titleRowMap = {
  year: 'Year',
  month: 'Month',
  name: 'Name',
  units: 'Units',
  goal: 'Goal',
  reached: 'Reached',
  id: 'id'
};
const titleRowKeys = ['year', 'month', 'name', 'units', 'goal', 'reached', 'id'];
// Adds the custom menu to the active spreadsheet.
function onOpen() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const menuEntries = [
    {
      name: 'Update to Calendar Tasks',
      functionName: 'syncToCalendar'
    }
  ];
  spreadsheet.addMenu('Calendar Sync', menuEntries);
}
// Responds do HTTP GET request calling the syncToSheet method
// function doGet() {
//   return ContentService.createTextOutput('Hello, world!');
// }

// Creates a mapping array between spreadsheet column and event field name
function createIdxMap(row) {
  const idxMap = [];
  for (let idx = 0; idx < row.length; idx++) {
    const fieldFromHdr = row[idx];
    for (const titleKey in titleRowMap) {
      if (titleRowMap[titleKey] == fieldFromHdr) {
        idxMap.push(titleKey);
        break;
      }
    }
    if (idxMap.length <= idx) {
      // Header field not in map, so add null
      idxMap.push(null);
    }
  }
  return idxMap;
}

// Converts a spreadsheet row into an object containing event-related fields
function reformatGoal(row, idxMap, keysToAdd) {
  const reformatted = row.reduce(function(event, value, idx) {
    if (idxMap[idx] != null) {
      event[idxMap[idx]] = value;
    }
    return event;
  }, {});
  for (const k in keysToAdd) {
    reformatted[keysToAdd[k]] = '';
  }
  return reformatted;
}

// Returns list of fields that aren't in spreadsheet
function missingFields(idxMap) {
  return titleRowKeys.filter(function(val) {
    return idxMap.indexOf(val) < 0;
  });
}

// Display error alert
function errorAlert(msg, evt, ridx) {
  const ui = SpreadsheetApp.getUi();
  if (evt) {
    ui.alert(`Skipping row: ${msg} in event "${evt.title}", row ${ridx + 1}`);
  } else {
    ui.alert(msg);
  }
}

// Given a date string ('yyyy-mm-dd') it returns an array of sundays (Date obj) in the given month
function sundaysInMonth(date) {
  const sundays = [];
  const arr = date.split('-').map(num => parseInt(num, 10));
  const d = new Date(arr);
  arr[1] += 1;
  const nextMonth = new Date(arr);

  for (d; d < nextMonth; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0) {
      const sunday = new Date(d.toString());
      sundays.push(`${sunday.getFullYear()}-${sunday.getMonth() + 1}-${sunday.getDate()}`);
    }
  }
  return sundays;
}

// Creates Goal Hash: { monthA: { goals... }, monthB: { goals... }, ...}
function monthlyGoalMapper(data) {
  // Map headers to indices
  const idxMap = createIdxMap(data[0]);
  const keysToAdd = missingFields(idxMap);

  // Loop through sheet rows and create goalMap (hash of goals consolidated by string date keys that are the 1st of the month)
  const goalMap = {};
  for (let ridx = 1; ridx < data.length; ridx++) {
    const sheetGoal = reformatGoal(data[ridx], idxMap, keysToAdd);
    sheetGoal.rowId = ridx;
    const date = `${sheetGoal.year}-${`0${sheetGoal.month}`.slice(-2)}-01`;
    if (goalMap[date] === undefined) goalMap[date] = [];
    goalMap[date].push(sheetGoal);
  }
  return goalMap;
}

// Creates hash with sundays (Date 'yyyy-mm-dd' string) as keys and list of weekly goals (strings) as values.
function goalBreakdown(data) {
  const goalMap = monthlyGoalMapper(data);
  const sundays = {};
  const weeklyGoals = {};
  Object.keys(goalMap).forEach(month => {
    sundays[month] = sundaysInMonth(month);
    sundays[month].forEach(sunday => {
      const listOfWeeklyGoals = [];
      goalMap[month].forEach(entry => {
        listOfWeeklyGoals.push({
          name: entry.name,
          goal: entry.goal / sundays[month].length,
          units: entry.units,
          completed: false,
          week_sunday: sunday,
          month: entry.month
        });
      });
      // add weekly events
      weeklyGoals[sunday] = listOfWeeklyGoals;
    });
  });
  return weeklyGoals;
}

function getTaskLists() {
  const taskLists = Tasks.Tasklists.list().getItems();
  if (!taskLists) {
    return [];
  }
  return taskLists.map(function(taskList) {
    return {
      id: taskList.getId(),
      name: taskList.getTitle()
    };
  });
}

// (date: datetime Obj)
function addTask(title, date, notes, taskList) {
  const task = {
    title,
    due: date.toISOString(),
    notes
  };
  Logger.log(JSON.stringify(Tasks.Tasks.insert(task, taskList.id)));
}

// ---------------------- Synchronize from spreadsheet to calendar ----------------------
function syncToCalendar() {
  // Get spreadsheet and data
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Goals');
  const range = sheet.getDataRange();
  const data = range.getValues();
  if (data.length < 2) {
    errorAlert('Spreadsheet must have a title row and at least one data row');
    return;
  }

  const sheetLog = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('logger'); // logger

  // Breakdown monthly goals into weekly goals
  const weeklyGoals = goalBreakdown(data);

  // Log goals in logger
  sheetLog.getRange('D1').setValue('Sunday');
  sheetLog.getRange('E1').setValue('weeklyGoals');
  sheetLog.getRange('F1').setValue('InTasks?');
  Object.keys(weeklyGoals).forEach((sunday, index) => {
    sheetLog.getRange(`D${index + 2}`).setValue(sunday);
    sheetLog.getRange(`E${index + 2}`).setValue(JSON.stringify(weeklyGoals[sunday]));
  });

  // Create calendar Tasks
  let taskList = getTaskLists().find(list => list.name === 'Goals');
  if (taskList === undefined) {
    taskList = Tasks.Tasklists.insert({ id: 'goals', title: 'Goals' });
  }

  Object.keys(weeklyGoals).forEach((sunday, index) => {
    weeklyGoals[sunday].forEach(goal => {
      Utilities.sleep(500);
      addTask(
        `${goal.name}: ${goal.goal}${goal.units} `,
        new Date(sunday),
        'you can do it!',
        taskList
      );
    });
    sheetLog.getRange(`F${index + 2}`).setValue('true');
  });
}

function temp() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('GoalsTemp');
  const range = sheet.getDataRange();
  const data = range.getValues();

  const goalMap = monthlyGoalMapper(data);
  Logger.log(JSON.stringify(goalMap));
  const breaker = true;
  if (breaker) return;

  const taskList = getTaskLists().find(list => list.name === 'Goals');

  Object.keys(goalMap).forEach(entry => {
    Utilities.sleep(500);
    addTask(
      `${entry.name}: ${entry.goal}${entry.units} `,
      new Date('2020-03-24'),
      'you can do it!',
      taskList
    );
  });
}
