# NoirMail
Created by Ethan Anyam
on 05 December2025

**NoirMail** — cinematic disposable mail using Mail.tm API

A beautiful, dark-themed disposable email client that runs entirely in your browser. Generate temporary email addresses, receive messages, and maintain your privacy with style.

## Features

- 🎨 **Cinematic Dark Design** - Beautiful noir-inspired interface with neon-blue accents
- 📧 **Disposable Email** - Generate temporary email addresses in seconds
- 🔄 **Auto-Refresh** - Inbox polls every 4 seconds for new messages
- 💾 **Session Persistence** - Your email session is saved locally
- 📱 **Mobile Responsive** - Works great on desktop and mobile devices
- 🔒 **Privacy First** - All data stays in your browser

## How to Run Locally

### Option 1: Direct Browser Open
Simply open `index.html` in your web browser. That's it! No build process required.

### Option 2: Local Server (Recommended)
For better compatibility and to avoid CORS issues:

**Using Python 3:**
```bash
python -m http.server 8000
```

**Using Python 2:**
```bash
python -m SimpleHTTPServer 8000
```

**Using Node.js (npx):**
```bash
npx serve
```

Then open your browser to `http://localhost:8000`

## Mail.tm API & Rate Limits

NoirMail uses the [Mail.tm](https://mail.tm) API to provide disposable email functionality.

### Important Notes:

- **Polite Polling**: The app polls for new messages every 4 seconds. This is a respectful interval that balances real-time updates with API courtesy.
- **Rate Limits**: Mail.tm has rate limits in place. If you receive a 429 error, wait a moment before generating a new email.
- **Email Expiration**: Emails and accounts expire after approximately 1 hour of inactivity.
- **No Persistence**: Messages are temporary and will be deleted when the session expires.

## Security & Privacy Notes

⚠️ **Important Security Considerations:**

1. **Public Service**: Mail.tm is a public service. Assume all emails could potentially be read by others.
2. **No Sensitive Data**: Never use disposable emails for sensitive information, passwords, or financial data.
3. **Domain Ownership**: Do not attempt to list or impersonate domains you don't own.
4. **Temporary Use Only**: These emails are meant for temporary, non-critical use cases like:
   - Testing applications
   - Avoiding spam when signing up for services
   - One-time verifications
   - Demo purposes

5. **XSS Protection**: The app sanitizes all message content by rendering as plain text by default.
6. **Local Storage**: Your session is stored in browser localStorage. Clear it if using a shared computer.

## Technology Stack

- **Pure Vanilla JavaScript** - No frameworks, no dependencies
- **HTML5 & CSS3** - Modern web standards
- **Mail.tm API** - Disposable email service

## File Structure

```
noirmail/
├── index.html    # Main HTML structure
├── styles.css    # Cinematic dark theme styling
├── script.js     # All JavaScript functionality
└── README.md     # This file
```

## API Endpoints Used

- `GET /domains` - Fetch available email domains
- `POST /accounts` - Create new email account
- `POST /token` - Authenticate and get token
- `GET /messages` - Fetch inbox messages
- `GET /messages/{id}` - Get specific message details
- `DELETE /messages/{id}` - Delete a message

## License

This project is provided as-is for educational and personal use.

## Credits

- **Mail.tm** - For providing the disposable email API
- **Design Inspiration** - Film noir aesthetic with modern UI principles

---

**Enjoy your privacy with style! 🕶️**
