# WhatsApp sandbox testing (free, limited)

Use Meta's **WhatsApp Cloud API** test mode to send messages to **your own phone only** (up to 5 test numbers). No payment card required for basic testing.

## 1. Create Meta app (one time, ~10 minutes)

1. Go to [developers.facebook.com](https://developers.facebook.com) and log in.
2. **My Apps → Create App** → type **Business** → name it e.g. `BMC Meetings Test`.
3. Add product **WhatsApp** → open **API Setup**.

## 2. Copy credentials

On the API Setup page note:

| Field | Put in `.env` |
|-------|----------------|
| Phone number ID | `WHATSAPP_PHONE_NUMBER_ID` |
| Temporary access token | `WHATSAPP_ACCESS_TOKEN` |

## 3. Add your phone as test recipient

Still on API Setup:

1. Under **To**, click **Manage phone number list**.
2. Add your WhatsApp number (the one you use on your phone).
3. Confirm the code Meta sends you on WhatsApp.

**Important:** Use international format in the app: `0757219157` → stored/sent as `255757219157`.

## 4. Configure `.env`

```env
APP_ENV=development
WHATSAPP_ENABLED=true
WHATSAPP_API_URL=https://graph.facebook.com/v21.0
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_ACCESS_TOKEN=your_temporary_token_here
WHATSAPP_USE_TEMPLATES=true
WHATSAPP_TEMPLATE_NAME=hello_world
WHATSAPP_TEMPLATE_LANGUAGE=en_US
```

Restart the backend after saving.

## 5. Send a test message

```powershell
# Check config
Invoke-RestMethod http://127.0.0.1:8000/api/dev/whatsapp/status

# Ping your phone (must be in Meta test recipient list)
Invoke-RestMethod http://127.0.0.1:8000/api/dev/whatsapp/ping `
  -Method POST -ContentType 'application/json' `
  -Body '{"phone":"0757219157","message":"BMC test"}'
```

You should receive the **hello_world** template on WhatsApp within a few seconds.

## 6. Test registration WhatsApp OTP

1. Set `WHATSAPP_ENABLED=true` in `.env`.
2. Restart backend.
3. Open `/register.html` and register with **your test phone number**.
4. Complete email OTP + WhatsApp OTP (code also shown in API response when `APP_ENV=development`).

## Custom message body (optional)

`hello_world` has no variables — it only proves delivery works.

To send your own text (invites, OTP text):

1. In Meta → **WhatsApp → Message templates**, create a **Utility** template:
   - Name: `bmc_notification`
   - Body: `{{1}}`
2. Wait for approval (sandbox is usually fast).
3. Update `.env`:
   ```env
   WHATSAPP_TEMPLATE_NAME=bmc_notification
   WHATSAPP_TEMPLATE_LANGUAGE=en
   ```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `(#131030) Recipient not in allowed list` | Add number in Meta API Setup → test recipients |
| `(#100) Invalid parameter` | Check phone format; use `2557...` not `+255...` |
| Token expired | Generate a new token on API Setup page |
| Message not received | Confirm `WHATSAPP_ENABLED=true` and restart server |

## Limits (test mode)

- Only **5 test recipient numbers**
- Temporary token expires in **24 hours** (regenerate in console)
- Cannot message random guests until business verification + approved templates

This is enough to verify automatic WhatsApp sending and that a number receives messages.
