# CRAB Code Lab — Netlify edition

A standalone React/Vite build of the CRAB Arduino workbench, redesigned around the user’s Visual Studio Code reference, with a compact dark workbench, red CRAB accents, and animated panels, file changes, dialogs, and build feedback. It does not use Sites or Cloudflare Workers. Submission recipient: **ethan.wong38@gmail.com**. The editor and Netlify API function are deployed at https://crab-code-lab.netlify.app. The compiler is hosted on Render’s free plan. Automatic C++ attachment delivery through Resend is configured and verified.

## Current deployment

- Live editor: https://crab-code-lab.netlify.app
- Netlify project: https://app.netlify.com/projects/crab-code-lab
- Team: `ethan-wong38`
- Project ID: `08aeb05d-6761-4d1f-a721-1038020a8f5a`
- Current production deploy: `6afa5a6dbef15ee81d0c28c5`
- The editor, local draft saving, C++ export, API function, and real Arduino compilation are live. The public Verify button compiled Blink successfully (924 bytes of program storage and 9 bytes of RAM). The live Netlify API also rejected invalid C++ with source diagnostics. Automatic Resend email is live. The authorized test submission arrived in the teacher’s inbox with its complete C++ attachment.
- No existing Netlify project was replaced. This is a manual CLI deployment; automatic Git deployments are not configured.

To publish a later revision, install the official Netlify CLI and run `netlify deploy --prod --site 08aeb05d-6761-4d1f-a721-1038020a8f5a` from this project folder. Log in to the same account when prompted. The CLI builds the project and packages its function.

## Classroom password and owner controls

The hosted website is protected by a CRAB password screen. Netlify Edge Functions guard the editor and assets, and the compiler function independently validates the signed session cookie. Sessions use an HttpOnly, Secure, SameSite=Strict cookie, expire after eight hours, and are invalidated when the class password changes. The Lock workspace button saves the current drafts before signing out.

To change the class password, open **https://crab-code-lab.netlify.app/owner**. Enter the separate owner key, enter the new class password twice, and choose **Save class password**. Changes apply immediately without deploying code. The new password must contain 4–128 characters. The classroom password cannot change owner settings.

The owner key is supplied separately in the private owner-access handoff file. It is excluded from this source repository and ZIP. Keep it private. The owner page never displays the current class password or the owner key.

Password settings use Netlify Blobs with strong consistency. Only a salted scrypt verifier, revision, and change timestamp are stored. Existing sessions stop working on their next request after a password change. The initial verifier is held in `CRAB_PASSWORD_HASH`; it is used only until a password record exists. `CRAB_SESSION_SECRET` signs sessions, and `CRAB_OWNER_KEY_HASH` stores the SHA-256 verifier of the random owner key. The owner explicitly approved the project's standard Free-plan environment-variable storage. These authentication values are readable by project members and build tooling; they are absent from source and public assets. Never expose these values through `VITE_` variables, source files, or logs.

The login function is limited to 20 requests per minute per IP/domain; owner settings use 10. These counts include successful requests. Users sharing a school IP may need to wait a minute if many log in together. Local loopback development remains ungated; deployed Netlify builds require the configured access variables.

## Deploy to Netlify

1. Put this project folder at the root of your Git repository, then import that repository into Netlify. If it is in a subfolder, select that subfolder as the base directory.
2. Use the included `netlify.toml`. It sets **build command `npm run build`**, **publish directory `dist`**, **functions directory `netlify/functions`**, and **Node 24**. Choose Vite or Other if Netlify asks for a framework.
3. Deploy the separate compiler service described below, then add these environment variables in Netlify using standard environment variables on the Free plan (or **Functions** scope on Pro and above):
   - `COMPILER_URL`: HTTPS origin of your compiler service.
   - `COMPILER_TOKEN`: the matching secret configured on that service.
4. Redeploy after changing runtime variables. Open the deployed website and check that the footer says **Compiler connected**. Verify a sketch before class.

Netlify’s Functions runtime reads these variables from its environment. Do not put secrets in `netlify.toml`, public files, or variables prefixed with `VITE_`.

The live site displays **Compiler connected** while the Render service is awake. Render Free sleeps after idle periods; the first request can take about a minute to wake it and may need a retry. Verification is optional for email. Any nonempty sketch can be sent, including unfinished code or code with compiler errors. The email reports whether this exact source has a current successful verification.

Import the source project rather than dragging only `dist` into Netlify: the compiler API needs the included Netlify Function, which is outside the static publish directory. A static-only upload supplies the editor and downloads but omits those API routes.

## Render compiler hosting

`render.yaml` defines a new free Docker web service using `service/Dockerfile`, a generated compiler token, one concurrent compile, and `/health` as its health check. Render is connected to Ethan’s workspace, and the private source repository is https://github.com/EthycaWong/crab-code-lab. The free compiler service is https://crab-arduino-compiler.onrender.com, managed at https://dashboard.render.com/web/srv-dbn9abp5efls73am2ufg. The current deploy is `dep-dbt5i56c6qcc73apukfg` from commit `7bbedb8`; it includes optional verification for email and the classroom library catalog and is live. Automatic deployments are off; publishing a source commit does not redeploy the compiler until a manual deploy is triggered.

When creating it through the dashboard, select Docker, the repository root as the build context, `./service/Dockerfile` as the Dockerfile, and Free as the instance type. The server accepts Render's `PORT` variable. `/health` exposes only `{ "ok": true }`; compiler status and code endpoints still require the shared token.

Copy the matching `COMPILER_TOKEN` and service HTTPS origin into Netlify environment variables, then redeploy. The Free plan uses all scopes and contexts; the user explicitly approved that setting for this project. Do not prefix credentials with `VITE_`, commit them, or print them in build logs. Verify both a valid sketch and one with a deliberate compiler error through the live editor before using it in class.

Render's free service sleeps after 15 minutes of inactivity and may take about a minute to wake. The first request may therefore need a retry. Free services also block SMTP ports 25, 465, and 587. Automatic mail needs a supported HTTPS email API, an SMTP provider using an allowed port, or a paid service with appropriate SMTP access. The application supports Resend over HTTPS, SMTP, and the downloadable `.eml` fallback. Free hosting is for preview testing; classroom load has not been measured.

Official references: [Render free service limits](https://render.com/docs/free), [Docker deployment](https://render.com/docs/docker), [Blueprint configuration](https://render.com/docs/blueprint-spec).

## Compiler and email service

The Netlify Function securely forwards `/api/status`, `/api/compile`, and `/api/submit` to the Node service in `service/`. This service runs the actual Arduino toolchain; the browser never receives the compiler token, Resend API key, or SMTP credentials.

The service needs Node 22.13+, Arduino CLI, and the `arduino:avr` core. A Dockerfile and Compose configuration are included. Run it on a Node/container host behind HTTPS. Set:

```dotenv
COMPILER_TOKEN=your-random-secret-at-least-24-characters
COMPILER_HOST=0.0.0.0
COMPILER_PORT=4319
```

Use the same token in Netlify. `COMPILER_URL` must point to this reachable HTTPS service; `localhost` on Netlify does not refer to your Mac. The Compose example binds the service to loopback so you can put a reverse proxy in front of it. To build it, run `docker compose -f service/compose.yaml up --build -d` from the project root with its required variables set in your environment.

For free Render hosting, use Resend over HTTPS. Create a free Resend account using **ethan.wong38@gmail.com**, create a Sending access API key, and set **RESEND_API_KEY** on the compiler service’s Render Environment page. Do not put the key in chat, GitHub, Netlify’s frontend, or this README. Keep existing variables in place and redeploy after saving.

The default sender is `CRAB Code Lab <onboarding@resend.dev>`, which Resend permits only for delivery to the Resend account owner’s email. The recipient remains fixed to ethan.wong38@gmail.com. Optionally set **EMAIL_FROM** to an address on your own verified domain later. Free Resend has sending quotas; the current documented daily limit is 100. No paid plan is required for this initial setup.

Email success means the provider accepted the message, not that every message is guaranteed to reach the inbox. A single authorized test was sent through the live website on November 7, 2026, with subject “CRAB submission: TEST ONLY — CRAB Code Lab setup — CRAB setup test”. It arrived in ethan.wong38@gmail.com’s inbox with CRAB_Setup_Test.cpp attached. The 273-byte attachment was read back from Gmail and matched the complete labeled Arduino C++ test source. Local mock tests also cover fixed-recipient delivery, attachment encoding, and provider failure handling.

Official references: [Resend sender restriction](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain), [Resend pricing](https://resend.com/pricing), [Send Email API](https://resend.com/docs/api-reference/emails/send-email).

SMTP is an alternative for hosts that allow it. Set these variables **on the compiler host**:

```dotenv
SMTP_HOST=smtp.your-provider.example
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASS=your-provider-app-password
SMTP_FROM=CRAB Code Lab <your-verified-sender@example.com>
```

The recipient is fixed server-side to ethan.wong38@gmail.com. Successful SMTP acceptance is shown as sent; it does not guarantee inbox delivery. If no email provider is configured, a sketch can download an `.eml` with the actual `.cpp` attached. Open it in your mail app and send it. If the app opens it read-only, forward it or attach the separately downloaded C++ file to a new message. Downloading an email does not send it.

For classroom use, keep the compiler in a dedicated container. The supplied Compose example uses a nonroot user, read-only filesystem, temporary builds, resource limits, a board allowlist, request limits, and timeouts. The service never executes student binaries. The Docker image also runs Arduino CLI under a Linux Landlock filesystem policy and seccomp network restrictions. Each build can write only its own temporary directory and read the toolchain; it cannot read `/app` or `/proc`, or execute files in the student build directory. The sandbox fails closed if the host lacks Landlock ABI 3. The Linux Docker check passed on GitHub Actions, including valid and invalid Arduino builds and denial of service-file and process-environment includes. Recheck on a new host before enabling verification. Local macOS development uses the normal CLI and does not apply this Linux wrapper; do not expose that local compiler publicly.

## Run locally on this Mac

```sh
npm ci
npm run lab
```

Open the Local URL printed in the terminal, normally http://127.0.0.1:5173. Keep the terminal open. Ctrl+C stops the compiler and website. On macOS you can also run **Launch CRAB.command**.

The launcher creates an ignored `.dev.vars` containing a random compiler secret and the local service URL. Add optional SMTP settings to that file and restart to enable direct mail locally.

Arduino CLI and an AVR core must be installed:

```sh
arduino-cli core update-index
arduino-cli core install arduino:avr@1.8.8
```

`npm run dev` starts only the editor server; `npm run lab` starts the editor and compiler together. For `npm run dev`, provide `COMPILER_URL` and `COMPILER_TOKEN` in the process environment to connect a compiler. Local preview middleware forwards requests through the same API handler as Netlify.

## Editor behavior

- Arduino-aware C++ colors, suggestions, indentation, search, bracket matching, line numbers, undo, and clickable compiler errors.
- Multiple sketches, starter examples, single-file .cpp/.ino imports, local browser autosave, and .cpp export. Drafts are tied to the browser and site origin. Export backups when moving to a different domain/device or clearing storage.
- Real Arduino CLI compilation for Uno, classic Nano (ATmega328P/new bootloader), and Mega 2560. No physical board is needed for verification. Verification does not simulate a circuit or upload firmware.
- Code or board changes invalidate the previous compile. Email submission does not require compilation. An optional signed ticket, bound to the exact source and board, lets the server label a submission as verified; missing, stale, or invalid tickets are sent as not verified.

The editor uses **C++ files**, like .cpp tabs in Arduino IDE. `Arduino.h` is included in builds and exports. Declare functions before calling them; this editor does not generate .ino function prototypes. Importing an .ino converts it to C++ and may require explicit declarations. The bundled library catalog below is already installed on the hosted compiler. Multi-file and uploaded custom-library editing are not included.

Cmd/Ctrl+P opens Go to File. Cmd/Ctrl+B toggles the explorer. Cmd/Ctrl+J toggles output. Arrow keys navigate file tabs. Editor settings include font size and a reduced-motion option. Cmd/Ctrl+Enter verifies. Cmd/Ctrl+S downloads C++. Cmd/Ctrl+F searches. Ctrl+Space suggests. Press Escape then Tab to move out of the editor with the keyboard.

## Included Arduino libraries

Open **Libraries** in the activity rail to see headers and add an include to the current sketch. Include completion and common library class suggestions are available in the editor. **Servo Sweep** is a working starter example.

The compiler image installs pinned versions from Arduino Library Manager: Servo 1.3.0, Stepper 1.1.3, LiquidCrystal 1.0.7, DHT sensor library 1.4.7, Adafruit Unified Sensor 1.1.15, Adafruit NeoPixel 1.15.5, NewPing 1.9.7, Bounce2 2.71.0, OneWire 2.3.8, DallasTemperature 4.0.6, and AccelStepper 1.64.0. Wire, SPI, EEPROM, and SoftwareSerial are provided by the AVR core.

For local compilation, run `npm run libraries` after installing the AVR core. To use an isolated sketchbook, set `ARDUINO_CONFIG_FILE` to an Arduino CLI configuration with your chosen user directory before running that command and starting the service.

The catalog is defined in `service/libraries.mjs`. To add another library, include its exact Library Manager name, header, and version there, list any dependencies explicitly, then rebuild/deploy the compiler. Downloads take place at image build time; student compilation stays offline inside its sandbox. Students do not need to install these libraries individually.

The optional-email path was tested through the real HTTP endpoint against a local capture-only SMTP server with Arduino CLI unavailable. Uncompiled code was accepted and labeled not verified. No additional real email was sent. Servo compiled for all three supported boards, and the bundled library smoke sketch compiled on Uno. These checks passed both in GitHub Actions Docker validation (run 43784824258) and on the deployed Render compiler. The authenticated Netlify preview reported all 15 library entries and exposed direct email before verification.

## Validation and limits

```sh
npm run build
npm run typecheck
npm test
```

The static Netlify build and TypeScript checks passed. Netlify handler tests check offline behavior, forwarding of exact source with server-only credentials, trusted client IP handling, and rejection of cross-origin submissions. Arduino CLI tests compile a valid sketch and reject a broken one with a source line, and check submission tickets. Uno, Nano, and Mega builds passed on the development machine.

The VS Code-inspired UI was checked at desktop and mobile sizes, including the explorer, real file tabs, per-file undo history, Go to File, board drawer, dialogs, output toggling, reduced-motion mode, and real compilation from the toolbar. Explorer interpolation and the indeterminate build animation were inspected during use. Netlify production deployment was completed. The live Verify button compiled Blink, a malformed sketch was rejected through the public API with source diagnostics, and the downloaded Blink.cpp contained the complete source. The compiler credential was absent from all 13 public build files. The hosting health/authentication test passed. The Docker image passed real compiler and filesystem-isolation checks on a Linux runner. Render deployment passed valid and invalid builds plus file-isolation checks. Real Resend delivery was verified through the live website with exactly one authorized setup test, confirmed in Gmail with its complete .cpp attachment. The API reports both compiler and email configured for an authenticated visitor. The password gate and owner controls passed 17 tests plus deployed preview checks, including immediate password persistence, invalidation of previous sessions, and denial of owner changes using only the classroom password.

## Documentation

- [Netlify build configuration](https://docs.netlify.com/build/configure-builds/file-based-configuration/)
- [Netlify Functions](https://docs.netlify.com/build/functions/get-started/)
- [Runtime environment variables](https://docs.netlify.com/build/functions/environment-variables/)
- [Arduino CLI](https://docs.arduino.cc/arduino-cli/getting-started/)

Built with React, Vite, CodeMirror, Lucide, and Arduino CLI. Fonts: DM Sans, Space Grotesk, IBM Plex Mono; license notices are in public/fonts. CRAB logo supplied by the user. Board artwork is illustrative. Arduino is a trademark of Arduino SA; this project is not affiliated with Arduino.
