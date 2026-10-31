/**
 * Loose Ends — Gmail bridge (Google Apps Script)
 *
 * Runs inside the team Gmail account. It does two jobs:
 *   1. SEND:    the app calls this script's web address to send an email from the team address.
 *   2. RECEIVE: every minute it looks for new unread emails and passes each one to the app (/api/inbound).
 *
 * Setup steps are in docs/setup/gmail-bridge.md. You do not need to edit anything below.
 * Settings live in Project Settings → Script properties:
 *   APP_URL        e.g. https://loose-ends.vercel.app   (no slash at the end)
 *   BRIDGE_SECRET  the same long random text as BRIDGE_SECRET in Vercel
 */

var DONE_LABEL = 'le-processed';

// Only emails that belong to Loose Ends are touched; the rest of the inbox is left alone.
// Morning emails are titled "Your N open tasks for <day>", so replies contain "open tasks".
// For a manual test, send an email whose subject contains "Loose Ends".
var SEARCH = 'in:inbox is:unread newer_than:3d (subject:"open tasks" OR subject:"Loose Ends")';

function props_() {
  return PropertiesService.getScriptProperties();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------- 1. SEND (called by the app) ----------
function doPost(e) {
  var req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'Body is not JSON' });
  }
  if (!req.secret || req.secret !== props_().getProperty('BRIDGE_SECRET')) {
    return json_({ ok: false, error: 'Wrong secret' });
  }
  if (req.action === 'send') {
    var opts = { name: 'Loose Ends' };
    if (req.replyTo) opts.replyTo = req.replyTo;
    if (req.html) opts.htmlBody = req.html;
    GmailApp.sendEmail(req.to, req.subject, req.text, opts);
    return json_({ ok: true });
  }
  return json_({ ok: false, error: 'Unknown action' });
}

// Lets you open the web address in a browser to check it is deployed.
function doGet() {
  return json_({ ok: true, message: 'Loose Ends Gmail bridge is running' });
}

// ---------- 2. RECEIVE (runs every minute) ----------
function checkInbox() {
  var appUrl = props_().getProperty('APP_URL');
  var secret = props_().getProperty('BRIDGE_SECRET');
  if (!appUrl || !secret) throw new Error('Set APP_URL and BRIDGE_SECRET in Script properties');
  var me = Session.getActiveUser().getEmail().toLowerCase();

  var threads = GmailApp.search(SEARCH, 0, 30);
  for (var i = 0; i < threads.length; i++) {
    var messages = threads[i].getMessages();
    for (var j = 0; j < messages.length; j++) {
      var m = messages[j];
      if (!m.isUnread()) continue;
      if (m.getFrom().toLowerCase().indexOf(me) !== -1) { m.markRead(); continue; } // our own sent email

      var payload = {
        gmail_message_id: m.getId(),
        from: m.getFrom(),
        to: [m.getTo(), m.getCc()].filter(String).join(', '),
        subject: m.getSubject() || '',
        text: m.getPlainBody() || '',
        received_at: m.getDate().toISOString()
      };
      var res = UrlFetchApp.fetch(appUrl + '/api/inbound', {
        method: 'post',
        contentType: 'application/json',
        headers: { 'x-bridge-secret': secret },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
      var code = res.getResponseCode();
      console.log(code + ' ' + payload.from + ': ' + res.getContentText().slice(0, 300));
      if (code === 200) {
        m.markRead();
        threads[i].addLabel(GmailApp.getUserLabelByName(DONE_LABEL) || GmailApp.createLabel(DONE_LABEL));
      }
      // Anything else stays unread and is tried again next minute. The app ignores repeats.
    }
  }
}

// ---------- One-off helpers: run these from the editor ----------

/** Run once: starts the every-minute inbox check. Running it again does not create duplicates. */
function setup() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'checkInbox') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('checkInbox').timeBased().everyMinutes(1).create();
  console.log('Inbox check will run every minute.');
}

/** Run once to approve permissions and check sending works: emails the team address itself. */
function testSend() {
  var me = Session.getActiveUser().getEmail();
  GmailApp.sendEmail(me, 'Loose Ends bridge test', 'If you can read this, sending works.', { name: 'Loose Ends' });
  console.log('Sent a test email to ' + me);
}
