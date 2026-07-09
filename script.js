// ── Sound system ──────────────────────────────────────────────────────────────
const SFX = (function () {
    const cache = {};
    const AudioCtx = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
    const ctx = new AudioCtx();

    function load(name, path) {
        fetch(path)
            .then(r => r.arrayBuffer())
            .then(buf => ctx.decodeAudioData(buf))
            .then(decoded => { cache[name] = decoded; })
            .catch(() => {});
    }

    function play(name, volume = 1) {
        const buf = cache[name];
        if (!buf) return;
        if (ctx.state === "suspended") ctx.resume();
        const src  = ctx.createBufferSource();
        const gain = ctx.createGain();
        src.buffer = buf;
        gain.gain.value = volume;
        src.connect(gain);
        gain.connect(ctx.destination);
        src.start(0);
    }

    load("type",     "sounds/Text 1.wav");
    load("boot",     "sounds/Complete.mp3");
    load("jump",     "sounds/Jump 1.wav");
    load("die",      "sounds/Hit damage 1.wav");
    load("score",    "sounds/Fruit collect 1.wav");
    load("start",    "sounds/Confirm 1.wav");
    load("click",    "sounds/click.mp3");
    load("qropen",     "sounds/open.mp3");
    load("qrclose",    "sounds/Cancel 1.wav");
    load("celebrate",  "sounds/Big Egg collect 1.wav");

    // BGM via <audio> element (handles streaming, no memory spike)
    const bgm = new Audio("sounds/2. I MONSTER - Daydream In Blue.mp3");
    bgm.loop   = true;
    bgm.volume = 0.22;
    let bgmStarted = false;

    function startBGM() {
        if (bgmStarted) return;
        bgmStarted = true;
        if (ctx.state === "suspended") ctx.resume();
        bgm.play().catch(() => {});
    }

    // Start BGM on first interaction anywhere on the page
    document.addEventListener("click",      startBGM, { once: true });
    document.addEventListener("touchstart", startBGM, { once: true });
    document.addEventListener("keydown",    startBGM, { once: true });

    return { play };
})();

document.addEventListener("DOMContentLoaded", () => {
    const terminalContent = document.getElementById("terminal-content");
    const cursor          = document.querySelector(".cursor");

    const profile  = document.getElementById("profile-section");
    const info     = document.getElementById("info-section");
    const actions  = document.getElementById("actions-section");

    // Inline card views — clicking a tab swaps the active view within the same card frame
    const cardEl    = document.querySelector(".card");
    const views     = Array.from(document.querySelectorAll(".view"));
    const tabBtns   = Array.from(document.querySelectorAll(".tab-btn"));
    let activeViewId = "view-home";

    // Populate CV / Letter panels from their <template> tags
    document.getElementById("view-cv-content")
        .appendChild(document.getElementById("cv-template").content.cloneNode(true));
    document.getElementById("view-letter-content")
        .appendChild(document.getElementById("letter-template").content.cloneNode(true));

    function showView(viewId) {
        if (viewId === activeViewId) return;
        SFX.play(viewId === "view-home" ? "qrclose" : "qropen", 0.5);

        views.forEach(v => v.classList.toggle("is-current", v.id === viewId));
        tabBtns.forEach(btn => btn.classList.toggle("is-active", btn.dataset.view === viewId));

        cardEl.classList.toggle("showing-panel", viewId !== "view-home");
        activeViewId = viewId;
    }

    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            showView(btn.dataset.view === activeViewId ? "view-home" : btn.dataset.view);
        });
    });

    document.querySelectorAll("[data-back]").forEach(btn => {
        btn.addEventListener("click", () => showView("view-home"));
    });

    terminalContent.textContent = "> ready";
    cursor.style.display = "none";

    [profile, info, actions].forEach(el => {
        el.classList.remove("is-hidden");
        el.classList.add("is-shown");
    });

    // Scale embedded project iframes (fixed 1280x720 desktop layout) down to fit their wrapper
    const projectFrames = Array.from(document.querySelectorAll(".cv-project-frame"));

    function scaleProjectFrames() {
        projectFrames.forEach(frame => {
            const wrap = frame.parentElement;
            const scale = wrap.clientWidth / 1280;
            frame.style.transform = `scale(${scale})`;
        });
    }

    scaleProjectFrames();
    window.addEventListener("resize", scaleProjectFrames);
});

// ── ASCII Flappy Bird ─────────────────────────────────────────────────────────
(function () {
    const COLS = 28, ROWS = 10;
    const GRAVITY = 0.14, JUMP = -0.55, PIPE_SPEED = 0.28, GAP = 5;
    const BIRD_COL = 4; // leftmost cell of the 3-char bird
    const BIRD_FRAMES = ['>^>', '>v>'];

    const pre     = document.getElementById("flappy-canvas");
    const overlay = document.getElementById("flappy-overlay");
    const wrap    = pre && pre.parentElement;
    if (!pre) return;

    const CONFETTI_CHARS = ['*', '+', 'x', 'o', '#', '@', '%', '!', '^', '~'];
    let raf, state, bird, pipes, score, frame, dead, confetti, lastScore;

    function reset() {
        if (celebRaf) { cancelAnimationFrame(celebRaf); celebRaf = null; }
        bird      = { y: ROWS / 2, vy: 0, frame: 0 };
        pipes     = [];
        score     = 0;
        lastScore = 0;
        frame     = 0;
        dead      = false;
        confetti  = [];
        spawnPipe();
    }

    function spawnConfetti() {
        for (let i = 0; i < 28; i++) {
            confetti.push({
                x: 2 + Math.random() * (COLS - 4),
                y: ROWS * Math.random(),
                vx: (Math.random() - 0.5) * 1.2,
                vy: -(Math.random() * 1.0 + 0.3),
                char: CONFETTI_CHARS[Math.floor(Math.random() * CONFETTI_CHARS.length)],
                life: 28 + Math.floor(Math.random() * 20),
            });
        }
    }

    function spawnPipe() {
        const top = 1 + Math.floor(Math.random() * (ROWS - GAP - 2));
        pipes.push({ x: COLS - 1, top });
    }

    function flap() {
        if (dead) {
            reset();
            overlay.textContent = "";
            overlay.classList.add("hidden");
            if (!raf) loop();
            return;
        }
        if (state === "idle") {
            state = "playing";
            SFX.play("start", 0.5);
            overlay.classList.add("hidden");
            if (!raf) loop();
            return;
        }
        SFX.play("jump", 0.4);
        bird.vy = JUMP;
    }

    function tick() {
        frame++;
        // bird physics
        bird.vy += GRAVITY;
        bird.y  += bird.vy;
        bird.frame = (bird.frame + 1) % (BIRD_FRAMES.length * 6);

        // pipes
        if (frame % Math.round(COLS / PIPE_SPEED / 3) === 0) spawnPipe();
        pipes.forEach(p => { p.x -= PIPE_SPEED; });
        pipes = pipes.filter(p => p.x > -2);

        // score
        pipes.forEach(p => {
            if (Math.round(p.x) === BIRD_COL) score++;
        });
        if (score > lastScore) { SFX.play("score", 0.35); lastScore = score; }

        // collision
        const by = Math.round(bird.y);
        if (bird.y < 0 || bird.y >= ROWS) { die(); return; }
        pipes.forEach(p => {
            const px = Math.round(p.x);
            for (let i = 0; i < 3; i++) {
                if (px === BIRD_COL + i) {
                    if (by < p.top || by >= p.top + GAP) { die(); return; }
                }
            }
        });
    }

    let celebRaf = null;

    function runCelebration() {
        // tick confetti physics
        confetti.forEach(c => {
            c.x += c.vx;
            c.y += c.vy;
            c.vy += 0.06; // gravity
            c.life--;
        });
        confetti = confetti.filter(c => c.life > 0);
        draw();
        if (confetti.length > 0) {
            celebRaf = requestAnimationFrame(runCelebration);
        }
    }

    function die() {
        dead = true;
        cancelAnimationFrame(raf);
        raf = null;
        if (score > 0) {
            SFX.play("celebrate", 0.7);
            spawnConfetti();
            overlay.textContent = `SCORE ${score}  TAP TO RETRY`;
            overlay.classList.remove("hidden");
            celebRaf = requestAnimationFrame(runCelebration);
        } else {
            SFX.play("die", 0.6);
            overlay.textContent = `SCORE ${score}  TAP TO RETRY`;
            overlay.classList.remove("hidden");
            draw();
        }
    }

    function draw() {
        const grid = [];
        for (let r = 0; r < ROWS; r++) {
            grid.push(new Array(COLS).fill(' '));
        }

        // pipes
        pipes.forEach(p => {
            const px = Math.round(p.x);
            if (px < 0 || px >= COLS) return;
            for (let r = 0; r < ROWS; r++) {
                if (r < p.top) {
                    grid[r][px] = r === p.top - 1 ? '╗' : '║';
                } else if (r >= p.top + GAP) {
                    grid[r][px] = r === p.top + GAP ? '╝' : '║';
                }
                if (px + 1 < COLS) {
                    if (r < p.top) grid[r][px + 1] = r === p.top - 1 ? '═' : ' ';
                    else if (r >= p.top + GAP) grid[r][px + 1] = r === p.top + GAP ? '═' : ' ';
                }
            }
        });

        // confetti
        confetti.forEach(c => {
            const cx = Math.round(c.x), cy = Math.round(c.y);
            if (cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS) grid[cy][cx] = c.char;
        });

        // bird (3 chars wide)
        const by = Math.round(bird.y);
        if (by >= 0 && by < ROWS) {
            const sprite = dead ? 'x x' : BIRD_FRAMES[Math.floor(bird.frame / 6) % BIRD_FRAMES.length];
            for (let i = 0; i < 3; i++) {
                if (BIRD_COL + i < COLS) grid[by][BIRD_COL + i] = sprite[i];
            }
        }

        // border
        const top    = '┌' + '─'.repeat(COLS) + '┐';
        const bottom = '└' + '─'.repeat(COLS) + '┘ ' + score;
        const rows   = grid.map(r => '│' + r.join('') + '│');

        pre.textContent = [top, ...rows, bottom].join('\n');
    }

    let lastTime = 0;
    const TICK_MS = 1000 / 30;

    function loop(ts = 0) {
        if (ts - lastTime >= TICK_MS) {
            lastTime = ts;
            tick();
            draw();
            if (dead) return;
        }
        raf = requestAnimationFrame(loop);
    }

    // draw idle frame
    function drawIdle() {
        reset();
        draw();
    }

    state = "idle";
    drawIdle();

    // input
    wrap.addEventListener("click",     flap);
    wrap.addEventListener("touchstart", e => { e.preventDefault(); flap(); }, { passive: false });
    document.addEventListener("keydown", e => {
        if (e.code === "Space" || e.code === "ArrowUp") flap();
    });
})();
