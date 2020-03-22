// --------------------- [TODO] ---------------------
// - iterate goal hash: breakdown into weekly goals and consolidate into weekly goal hash ???
// - build consolidated event hash (same week => same event)

// Used Dave's work as a starting point: https://github.com/Davepar/gcalendarsync

// Set this value to match your calendar!!!
// Calendar ID can be found in the "Calendar Address" section of the Calendar Settings.
const calendarId = 'mpcannabrava@gmail.com';

const titleRowMap = {
  month: 'Month',
  name: 'Name',
  units: 'Units',
  goal: 'Goal',
  reached: 'Reached',
  id: 'id'
};
const titleRowKeys = ['month', 'name', 'units', 'goal', 'reached', 'id'];
// Adds the custom menu to the active spreadsheet.
function onOpen() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const menuEntries = [
    {
      name: 'Update to Calendar',
      functionName: 'syncToCalendar'
    }
  ];
  spreadsheet.addMenu('Calendar Sync', menuEntries);
}
// --------------------------------------------------------------------------------------

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
function reformatEvent(row, idxMap, keysToAdd) {
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

// --------------------------------------------------------------------------------------
// ---------------------- Synchronize from spreadsheet to calendar ----------------------
// --------------------------------------------------------------------------------------
function syncToCalendar() {
  console.info('Starting sync to calendar');
  // Get calendar and events
  const calendar = CalendarApp.getCalendarById(calendarId);
  if (!calendar) errorAlert('Cannot find calendar. Check instructions for set up.');

  // Get spreadsheet and data
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('GoalsTemp');
  const range = sheet.getDataRange();
  const data = range.getValues();
  if (data.length < 2) {
    errorAlert('Spreadsheet must have a title row and at least one data row');
    return;
  }

  // Map headers to indices
  const idxMap = createIdxMap(data[0]);
  const keysToAdd = missingFields(idxMap);

  // Loop through spreadsheet rows and create goalMap (hash of goals consolidated by Date keys that are the 1st of the month)
  const goalMap = {};
  for (let ridx = 1; ridx < data.length; ridx++) {
    const sheetEvent = reformatEvent(data[ridx], idxMap, keysToAdd); // Reformatted Sheet Event: {name=Easy Challenges, month=3.0, id=, reached=, goal=20.0, units=#}
    sheetEvent.rowId = ridx;
    const date = Utilities.formatDate(new Date(`2020-${sheetEvent.month}-01`), 'GMT', 'yyyy-MM-dd');
    if (goalMap[date] === undefined) goalMap[date] = [];
    goalMap[date].push(sheetEvent);
  }

  // UGLY BUT USEFUL TEST CODE :) -----------------------
  Logger.log(`goalMap: ${JSON.stringify(goalMap)}`);
  const sheetLog = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('logger');
  const rangeLog = sheetLog.getRange('A1');
  rangeLog.setValue(JSON.stringify(goalMap));
  // const breaker = true;
  // if (breaker) return;
  // ----------------------------------------------------
}

// ----------------------- to be used soon -----------------------
function saveToCal() {
  const newEvent = calendar.createAllDayEvent('Monthly Goals', date, sheetEvent);
  // Put event ID back into spreadsheet
  idData[ridx][0] = newEvent.getId();
  newEvent.setColor('10');

  // Save spreadsheet changes
  if (eventsAdded) {
    idRange.setValues(idData);
  }
}
