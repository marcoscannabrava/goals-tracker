// --------------------- [TODO] ---------------------
// - iterate rows and build a goal hash { {month: 1, unit: 'x', ... }, {}, {}, ... }
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
    },
    {
      name: 'Test App',
      functionName: 'syncToCalendar'
    }
  ];
  spreadsheet.addMenu('Calendar Sync', menuEntries);
}
// --------------------------------------------------------------------------------------

// ------------------------------------ TESTING -----------------------------------------
function testAlert(msg) {
  const ui = SpreadsheetApp.getUi();
  ui.alert(msg);
}
function testApp() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('GoalsTemp');
  const data = sheet.getDataRange().getValues();

  Logger.log(data);
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

// Converts a calendar event to a pseudo-sheet event.
function convertCalEvent(calEvent) {
  convertedEvent = {
    id: calEvent.getId(),
    title: calEvent.getTitle(),
    description: calEvent.getDescription(),
    location: calEvent.getLocation(),
    guests: calEvent
      .getGuestList()
      .map(function(x) {
        return x.getEmail();
      })
      .join(','),
    color: calEvent.getColor()
  };
  if (calEvent.isAllDayEvent()) {
    convertedEvent.starttime = calEvent.getAllDayStartDate();
    const endtime = calEvent.getAllDayEndDate();
    if (endtime - convertedEvent.starttime === 24 * 3600 * 1000) {
      convertedEvent.endtime = '';
    } else {
      convertedEvent.endtime = endtime;
      if (endtime.getHours() === 0 && endtime.getMinutes() == 0) {
        convertedEvent.endtime.setSeconds(endtime.getSeconds() - 1);
      }
    }
  } else {
    convertedEvent.starttime = calEvent.getStartTime();
    convertedEvent.endtime = calEvent.getEndTime();
  }
  return convertedEvent;
}

// Converts calendar event into spreadsheet data row
function calEventToSheet(calEvent, idxMap, dataRow) {
  convertedEvent = convertCalEvent(calEvent);

  for (let idx = 0; idx < idxMap.length; idx++) {
    if (idxMap[idx] !== null) {
      dataRow[idx] = convertedEvent[idxMap[idx]];
    }
  }
}

// Returns empty string or time in milliseconds for Date object
function getEndTime(ev) {
  return ev.endtime === '' ? '' : ev.endtime.getTime();
}

// Set up formats and hide ID column for empty spreadsheet
function setUpSheet(sheet, fieldKeys) {
  sheet.getRange(1, fieldKeys.indexOf('starttime') + 1, 999).setNumberFormat(dateFormat);
  sheet.getRange(1, fieldKeys.indexOf('endtime') + 1, 999).setNumberFormat(dateFormat);
  sheet.hideColumns(fieldKeys.indexOf('id') + 1);
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
  const scriptStart = Date.now();
  // Get calendar and events
  const calendar = CalendarApp.getCalendarById(calendarId);
  if (!calendar) errorAlert('Cannot find calendar. Check instructions for set up.');

  // const calEvents = calendar.getEvents(beginDate, endDate);
  // const calEventIds = calEvents.map(function(val) {
  //   return val.getId();
  // });

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
  const idIdx = idxMap.indexOf('id');
  const idRange = range.offset(0, idIdx, data.length, 1);
  const idData = idRange.getValues();

  const keysToAdd = missingFields(idxMap);

  // Loop through spreadsheet rows
  let numAdded = 0;
  let eventsAdded = false;
  for (let ridx = 1; ridx < data.length; ridx++) {
    const sheetEvent = reformatEvent(data[ridx], idxMap, keysToAdd);

    // [20-03-21 18:05:53:081 BRT] Event
    // [20-03-21 18:05:53:087 BRT] {guests=, location=, title=Third Event, starttime=Sat Mar 21 20:00:00 GMT-07:00 2020, color=, description=This is the testing event's description, endtime=, id=}
    const date = new Date(`2020-${sheetEvent.month}-01`);
    const newEvent = calendar.createAllDayEvent('Monthly Goals', date, sheetEvent);

    // UGLY BUT USEFUL TEST CODE :) -----------------------
    Logger.log('Event');
    Logger.log(sheetEvent);
    Logger.log('Time Stamp: Sat Mar 21 20:00:00 GMT-07:00 2020');
    Logger.log(date);
    const breaker = true;
    if (breaker) return;
    // ----------------------------------------------------
    // Put event ID back into spreadsheet
    idData[ridx][0] = newEvent.getId();
    eventsAdded = true;

    // Set event color
    if (sheetEvent.color > 0 && sheetEvent.color < 12) {
      newEvent.setColor(`${sheetEvent.color}`);
    }

    // Throttle updates.
    numAdded++;
    Utilities.sleep(THROTTLE_SLEEP_TIME);
    if (numAdded % 10 === 0) {
      console.info('%d events added, time: %d msecs', numAdded, Date.now() - scriptStart);
    }

    // If the script is getting close to timing out, save the event IDs added so far to avoid lots
    // of duplicate events.
    if (Date.now() - scriptStart > MAX_RUN_TIME) {
      idRange.setValues(idData);
    }
  }

  // Save spreadsheet changes
  if (eventsAdded) {
    idRange.setValues(idData);
  }

  // Remove any calendar events not found in the spreadsheet
  // var numToRemove = calEventIds.reduce(function(prevVal, curVal) {
  //   if (curVal !== null) {
  //     prevVal++;
  //   }
  //   return prevVal;
  // }, 0);
  // if (numToRemove > 0) {
  //   var ui = SpreadsheetApp.getUi();
  //   var response = ui.alert('Delete ' + numToRemove + ' calendar event(s) not found in spreadsheet?',
  //         ui.ButtonSet.YES_NO);
  //   if (response == ui.Button.YES) {
  //     var numRemoved = 0;
  //     calEventIds.forEach(function(id, idx) {
  //       if (id != null) {
  //         calEvents[idx].deleteEvent();
  //         Utilities.sleep(THROTTLE_SLEEP_TIME);
  //         numRemoved++;
  //         if (numRemoved % 10 === 0) {
  //           console.info('%d events removed, time: %d msecs', numRemoved, Date.now() - scriptStart);
  //         }
  //       }
  //     });
  //   }
  // }
}

// Set up a trigger to automatically update the calendar when the spreadsheet is
// modified. See the instructions for how to use this.
function createSpreadsheetEditTrigger() {
  const ss = SpreadsheetApp.getActive();
  ScriptApp.newTrigger('syncToCalendar')
    .forSpreadsheet(ss)
    .onEdit()
    .create();
}

// Delete the trigger. Use this to stop automatically updating the calendar.
function deleteTrigger() {
  // Loop over all triggers.
  const allTriggers = ScriptApp.getProjectTriggers();
  for (let idx = 0; idx < allTriggers.length; idx++) {
    if (allTriggers[idx].getHandlerFunction() === 'syncToCalendar') {
      ScriptApp.deleteTrigger(allTriggers[idx]);
    }
  }
}
