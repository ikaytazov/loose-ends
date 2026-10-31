# Connecting the team Gmail (about 15 minutes, once)

The team address (signalridgeco@gmail.com) sends every morning email and receives every reply. A small Google Apps Script
inside that Gmail account does both jobs. No Google Cloud project, no passwords stored in the app.

You need: to be signed in to **signalridgeco@gmail.com** in your browser, and the app's web address from Vercel
(e.g. `https://loose-ends.vercel.app`).

## 1. Create the script
1. Go to **script.google.com** (signed in as signalridgeco@gmail.com) → **New project**.
2. Click "Untitled project" at the top and rename it **Loose Ends bridge**.
3. Delete everything in the editor, paste the whole of `gmail-bridge/Code.gs` from the repo, and click the save icon.

## 2. Add the two settings
1. Left sidebar → **Project Settings** (gear icon) → scroll to **Script properties** → **Add script property**.
2. Add `APP_URL` = your Vercel address, with no slash at the end.
3. Add `BRIDGE_SECRET` = the same long random text you put in Vercel as `BRIDGE_SECRET`.
4. **Save script properties**.

## 3. Give it permission and test sending
1. Back in the **Editor**, choose `testSend` in the function dropdown at the top, click **Run**.
2. Google asks for permission: **Review permissions** → choose the account → "Google hasn't verified this app" →
   **Advanced** → **Go to Loose Ends bridge (unsafe)** → **Allow**. (It is "unverified" only because you wrote it yourself.)
3. Check the inbox: a "Loose Ends bridge test" email should arrive.

## 4. Turn on receiving
1. Choose `setup` in the dropdown, click **Run**. From now on, every minute, new unread emails are passed to the app.
2. To watch it: left sidebar → **Executions**.

## 5. Publish the sending address
1. **Deploy** (top right) → **New deployment** → gear icon → **Web app**.
2. Description "v1", **Execute as: Me**, **Who has access: Anyone**. → **Deploy**.
3. Copy the **Web app URL** (ends in `/exec`). Put it in Vercel as `GMAIL_BRIDGE_URL`, then redeploy the app.
4. Opening that URL in a browser should show `{"ok":true,"message":"Loose Ends Gmail bridge is running"}`.

If you later change the script, use **Deploy → Manage deployments → edit (pencil) → Version: New version → Deploy**
so the URL stays the same.

## Check it works
- Open `<app address>/api/health`. `gmail_bridge` should say **"ok"**. If it says the bridge answered with a web page,
  the deployment's "Who has access" is not "Anyone", or `GMAIL_BRIDGE_URL` is not the `/exec` address.
- To send a real test email (to a team member or the team address), call `POST /api/dev/test-email` with header
  `x-bridge-secret: <BRIDGE_SECRET>` and body `{"to": "someone@on-the-team"}`. Ask Iliyan or Claude to run it.

## Good to know
- Replies arrive in the app within about a minute (the script checks every minute).
- Emails the app has handled are marked read and labelled `le-processed`. Leave them alone.
- Gmail lets a script send to about 100 people a day — plenty for the demo.
- Only unread emails whose subject contains "open tasks" (replies to morning emails) or "Loose Ends" (manual tests)
  are passed to the app. The rest of the inbox is never touched. Emails from people not in the team list are recorded and ignored.
- The morning email subject must keep the words "open tasks" (agreement C) or replies will not be picked up.
