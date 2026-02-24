document.addEventListener("DOMContentLoaded", () => {
    const terminalContent = document.getElementById("terminal-content");
    const terminalHeader = document.getElementById("terminal-header");

    const profile = document.getElementById("profile-section");
    const info = document.getElementById("info-section");
    const actions = document.getElementById("actions-section");

    const lines = ["> booting profile...", "> loading links...", "> ready"];

    let lineIndex = 0;
    let charIndex = 0;

    const TYPE_SPEED = 18;
    const LINE_DELAY = 140;

    function typeNextChar() {
        if (lineIndex >= lines.length) {
            onBootComplete();
            return;
        }

        const line = lines[lineIndex];

        if (charIndex === 0 && lineIndex > 0)
            terminalContent.innerHTML += "<br>";

        terminalContent.innerHTML += line[charIndex];
        charIndex++;

        if (charIndex < line.length) {
            setTimeout(typeNextChar, TYPE_SPEED);
        } else {
            lineIndex++;
            charIndex = 0;
            setTimeout(typeNextChar, LINE_DELAY);
        }
    }

    function show(el, delay = 0) {
        setTimeout(() => {
            el.classList.remove("is-hidden");
            el.classList.add("is-shown");
        }, delay);
    }

    function onBootComplete() {
        show(profile, 80);
        show(info, 200);
        show(actions, 320);

        setTimeout(() => {
            terminalHeader.style.transition =
                "opacity 300ms ease, transform 300ms ease";
            terminalHeader.style.opacity = "0";
            terminalHeader.style.transform = "translateY(-6px)";

            setTimeout(() => {
                terminalHeader.style.display = "none";
            }, 320);
        }, 650);
    }

    setTimeout(typeNextChar, 180);
});
