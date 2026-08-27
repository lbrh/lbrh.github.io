/**
 * Fires the instant someone submits the PPNYC Document Hub Google Form,
 * and pushes the submission straight to the Cloudflare Worker
 * (ppnyc-docs-worker.js) so the live document link updates within
 * seconds — no polling.
 *
 * Setup:
 * 1. Open the Form's response Google Sheet.
 * 2. Extensions -> Apps Script.
 * 3. Delete the placeholder code and paste this file in.
 * 4. Fill in WEBHOOK_URL (your deployed worker's URL + "/update") and
 *    SHARED_SECRET (must exactly match the worker's UPDATE_SECRET).
 * 5. Save, then click the clock icon (Triggers) in the left sidebar ->
 *    Add Trigger -> choose function "onFormSubmit", event source
 *    "From spreadsheet", event type "On form submit" -> Save.
 * 6. Google will ask you to authorize the script (it needs permission
 *    to make an outbound request) — this is your own script running in
 *    your own account, so it's safe to allow.
 * 7. Submit a test response through the Form and check Executions
 *    (left sidebar) to confirm it ran and see the worker's response.
 *
 * The question titles below ("Which document?" and the file-upload
 * question) must match your Form's actual question text exactly, since
 * that's how Apps Script names the response columns.
 */

var WEBHOOK_URL = 'https://REPLACE-WITH-YOUR-WORKER-SUBDOMAIN.workers.dev/update';
var SHARED_SECRET = 'REPLACE_WITH_THE_SAME_SECRET_YOU_SET_ON_THE_WORKER';

var DOCUMENT_QUESTION_TITLE = 'Which document?';
var FILE_QUESTION_TITLE = 'Upload the PDF';

function onFormSubmit(e) {
  var responses = e.namedValues || {};
  var label = firstValue(responses[DOCUMENT_QUESTION_TITLE]);
  var fileLinkRaw = firstValue(responses[FILE_QUESTION_TITLE]);

  if (!label || !fileLinkRaw) {
    Logger.log('Missing "%s" or "%s" in this submission — skipping.', DOCUMENT_QUESTION_TITLE, FILE_QUESTION_TITLE);
    return;
  }

  // A file-upload question can log more than one link, comma-separated,
  // if someone attaches multiple files. Only the first is used.
  var driveUrl = fileLinkRaw.split(',')[0].trim();

  var payload = { label: label, driveUrl: driveUrl };

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-Update-Secret': SHARED_SECRET },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  var response = UrlFetchApp.fetch(WEBHOOK_URL, options);
  Logger.log('Worker responded: %s %s', response.getResponseCode(), response.getContentText());
}

function firstValue(arr) {
  return arr && arr.length ? arr[0] : null;
}
