This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Fullscreen assessments and kiosk deployment

Game assessments run on the dedicated route:

```text
/game-assessment/ASSIGNMENT_ID?role=student
```

Parent-supervised attempts also include the assigned child ID. This route renders
only the assessment experience—no dashboard, sidebar, header, or dashboard
container.

In a normal browser, the application requests current-tab screen sharing and then
uses the Fullscreen API. This is the strongest fullscreen experience a web page
can request. Chrome's screen-sharing indicator is browser-controlled and may
remain visible.

To remove Chrome's address bar, tabs, bookmarks, and navigation controls,
school-controlled computers must launch Chrome in kiosk mode. Replace the domain
and assignment ID below with production values; never use localhost in production.

macOS:

```bash
open -a "Google Chrome" --args --kiosk "https://YOUR-ASSESSMENT-DOMAIN/game-assessment/ASSIGNMENT_ID?role=student"
```

Windows:

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk "https://YOUR-ASSESSMENT-DOMAIN/game-assessment/ASSIGNMENT_ID?role=student"
```

Linux:

```bash
google-chrome --kiosk "https://YOUR-ASSESSMENT-DOMAIN/game-assessment/ASSIGNMENT_ID?role=student"
```

For managed ChromeOS devices, configure a kiosk web app in the Google Admin
console with the production assessment origin and restrict navigation to that
origin. The device must have an authenticated assessment session before opening
the assignment URL; provision it through the school's approved sign-in or
device-management flow.

These controls are distinct:

- Browser fullscreen is requested by the web application.
- Screen recording uses the stream explicitly selected in Chrome's sharing UI.
- Chrome's sharing indicator is security UI and is never manipulated by the app.
- True kiosk mode is configured by school device administrators; React or
  JavaScript cannot force it on an unmanaged computer.
