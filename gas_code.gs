function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.openById('YOUR_SPREADSHEET_ID').getSheetByName('工作表1');
    sheet.appendRow([
      new Date(),
      body.city,
      body.departDate,
      body.weatherType,
      body.averageTemp,
      body.packingList.join(', ')
    ]);
    return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}
