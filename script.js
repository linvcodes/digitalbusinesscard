document.addEventListener("DOMContentLoaded", () => {
    const terminalContent = document.getElementById("terminal-content");
    const terminalHeader  = document.getElementById("terminal-header");
    const cursor          = document.querySelector(".cursor");

    const profile   = document.getElementById("profile-section");
    const info      = document.getElementById("info-section");
    const actions   = document.getElementById("actions-section");
    const qrSection = document.getElementById("qr-section");
    const qrCanvas  = document.getElementById("qr-canvas");

    const lines = ["> booting profile...", "> loading links...", "> ready"];

    const GLYPHS          = "!<>-_\\/[]{}=+*^?#@$%&|";
    const TYPE_SPEED      = 18;  // ms between chars
    const SCRAMBLE_FRAMES = 2;   // rAF noise frames before resolving
    const LINE_DELAY      = 160;

    let lineIndex = 0;
    let charIndex = 0;

    function randomGlyph() {
        return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    }

    function scrambleChar(span, targetChar, framesLeft, onDone) {
        if (framesLeft <= 0) {
            span.textContent = targetChar;
            span.classList.add("resolved");
            onDone();
            return;
        }
        span.textContent = randomGlyph();
        requestAnimationFrame(() =>
            scrambleChar(span, targetChar, framesLeft - 1, onDone)
        );
    }

    function typeNextChar() {
        if (lineIndex >= lines.length) { onBootComplete(); return; }

        const line = lines[lineIndex];
        if (charIndex === 0 && lineIndex > 0)
            terminalContent.appendChild(document.createElement("br"));

        const span = document.createElement("span");
        terminalContent.appendChild(span);
        const targetChar = line[charIndex++];

        scrambleChar(span, targetChar, SCRAMBLE_FRAMES, () => {
            if (charIndex < line.length) {
                setTimeout(typeNextChar, TYPE_SPEED);
            } else {
                lineIndex++; charIndex = 0;
                setTimeout(typeNextChar, LINE_DELAY);
            }
        });
    }

    function show(el, delay = 0) {
        setTimeout(() => {
            el.classList.remove("is-hidden");
            el.classList.add("is-shown");
        }, delay);
    }

    function onBootComplete() {
        cursor.classList.add("boot-flash");
        setTimeout(() => { cursor.style.display = "none"; }, 420);

        const qrSize = Math.round(Math.min(Math.max(window.innerHeight * 0.08, 46), 72));
        QRCode.toCanvas(qrCanvas, "https://github.com/linvcodes/digitalbusinesscard.git", {
            width: qrSize,
            margin: 1,
            color: { dark: "#dbfe01", light: "#000000" }
        });

        show(profile,    80);
        show(info,      220);
        show(qrSection, 300);
        show(actions,   380);

        setTimeout(() => { terminalHeader.classList.add("collapsing"); }, 700);
    }

    setTimeout(typeNextChar, 180);
});
