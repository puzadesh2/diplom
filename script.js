(function () {
    // Отключаем восстановление позиции скролла браузером
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    // Прокручиваем к началу
    window.scrollTo(0, 0);

    const linesContainer = document.querySelector(".lines");
    const linesContainerBox = linesContainer && linesContainer.closest(".lines-container");
    const introInnerBox = document.querySelector(".page > .wrapper:first-child .intro-inner");
    const hint = document.getElementById("hint");
    const photoStage = document.querySelector(".page > .wrapper:first-child .photo-stage");
    const firstWrapper = photoStage && photoStage.closest(".wrapper");
    const img = photoStage && photoStage.querySelector(".photo-bg");
    let noMotionTimer;

    function disableOverlayMotionTemporarily() {
        if (!photoStage) return;
        photoStage.classList.add("no-motion");
        clearTimeout(noMotionTimer);
        noMotionTimer = setTimeout(() => {
            photoStage.classList.remove("no-motion");
        }, 140);
    }

    function syncOverlayWithPhotoPan() {
        if (!photoStage || !img || !img.naturalWidth || !img.naturalHeight) return;

        const boxW = img.clientWidth;
        const boxH = img.clientHeight;
        if (!boxW || !boxH) return;

        const imgRatio = img.naturalWidth / img.naturalHeight;
        const boxRatio = boxW / boxH;
        const renderedW = imgRatio > boxRatio ? boxH * imgRatio : boxW;
        const overflowX = Math.max(0, renderedW - boxW);
        const stageW = photoStage.clientWidth || 0;
        const nudgePercentRaw = getComputedStyle(photoStage).getPropertyValue("--photo-pan-nudge").trim();
        const nudgePercent = parseFloat(nudgePercentRaw);
        const nudgePx = Number.isFinite(nudgePercent) ? (stageW * nudgePercent / 100) : 0;

        /* object-position: 100% -> 0% двигает содержимое фото вправо на overflowX px */
        photoStage.style.setProperty("--photo-bg-pan-x", `${overflowX.toFixed(2)}px`);
        photoStage.style.setProperty("--photo-pan-nudge-px", `${nudgePx.toFixed(2)}px`);
        if (firstWrapper) {
            firstWrapper.style.setProperty("--photo-bg-pan-x", `${overflowX.toFixed(2)}px`);
            firstWrapper.style.setProperty("--photo-pan-nudge-px", `${nudgePx.toFixed(2)}px`);
        }
    }

    /** Подбирает font-size на .lines-container так, чтобы обе строки стиха помещались в одну линию каждая (всего 2 строки). */
    function fitTwoLinesFont() {
        if (!linesContainerBox) return;
        const items = linesContainerBox.querySelectorAll(".line-item");
        if (!items.length) return;

        linesContainerBox.style.fontSize = "";
        void linesContainerBox.offsetWidth;
        const maxPx = parseFloat(getComputedStyle(linesContainerBox).fontSize) || 31;

        function allFit(px) {
            linesContainerBox.style.fontSize = px + "px";
            void linesContainerBox.offsetWidth;
            for (let i = 0; i < items.length; i++) {
                const el = items[i];
                if (el.scrollWidth > el.clientWidth + 0.25) return false;
            }
            return true;
        }

        if (allFit(maxPx)) {
            linesContainerBox.style.fontSize = maxPx + "px";
            return;
        }

        let lo = 4;
        let hi = maxPx;
        while (hi - lo > 0.2) {
            const mid = (lo + hi) / 2;
            if (allFit(mid)) lo = mid;
            else hi = mid;
        }

        let finalPx = lo;
        while (finalPx > 4 && !allFit(finalPx)) {
            finalPx -= 0.25;
        }
        linesContainerBox.style.fontSize = finalPx + "px";
        void linesContainerBox.offsetWidth;
    }

    function scheduleFitTwoLinesFont() {
        requestAnimationFrame(() => requestAnimationFrame(fitTwoLinesFont));
    }

    let resizeFitTimer;
    window.addEventListener("resize", () => {
        disableOverlayMotionTemporarily();
        clearTimeout(resizeFitTimer);
        resizeFitTimer = setTimeout(scheduleFitTwoLinesFont, 100);
    });

    if (linesContainerBox && typeof ResizeObserver !== "undefined") {
        new ResizeObserver(() => scheduleFitTwoLinesFont()).observe(linesContainerBox);
    }
    if (introInnerBox && typeof ResizeObserver !== "undefined") {
        new ResizeObserver(() => scheduleFitTwoLinesFont()).observe(introInnerBox);
    }

    if (photoStage && img) {
        const enablePanTransition = () => photoStage.classList.add("photo-pan-interactive");
        if (img.complete) {
            requestAnimationFrame(() => requestAnimationFrame(enablePanTransition));
            requestAnimationFrame(() => requestAnimationFrame(syncOverlayWithPhotoPan));
        } else {
            img.addEventListener(
                "load",
                () => {
                    requestAnimationFrame(() => requestAnimationFrame(enablePanTransition));
                    requestAnimationFrame(() => requestAnimationFrame(syncOverlayWithPhotoPan));
                },
                { once: true }
            );
        }
    }

    (function initMermaidLottie() {
        const el = document.getElementById("mermaid-lottie");
        if (!el || typeof lottie === "undefined") return;
        const anim = lottie.loadAnimation({
            container: el,
            renderer: "svg",
            loop: true,
            autoplay: true,
            path: "images/mermaid1.json",
            rendererSettings: {
                preserveAspectRatio: "xMidYMid meet",
            },
        });
        function resizeAnim() {
            if (anim && typeof anim.resize === "function") anim.resize();
        }
        function showReady() {
            resizeAnim();
            requestAnimationFrame(() => el.classList.add("ready"));
        }
        if (photoStage && typeof ResizeObserver !== "undefined") {
            new ResizeObserver(() => {
                resizeAnim();
                syncOverlayWithPhotoPan();
            }).observe(photoStage);
        }
        window.addEventListener("resize", () => {
            disableOverlayMotionTemporarily();
            resizeAnim();
            syncOverlayWithPhotoPan();
        });
        anim.addEventListener("DOMLoaded", showReady);
        resizeAnim();
        syncOverlayWithPhotoPan();
    })();

    const poemLines = [
        "У лукоморья дуб зелёный;",
        "Златая цепь на дубе том:",
        "И днём и ночью кот учёный",
        "Всё ходит по цепи кругом;",
        "Идёт направо — песнь заводит,",
        "Налево — сказку говорит."
    ];

    /* [0,1] → скролл1: [2,3]+zoom → скролл2: [4,5] → скролл3: только панорама, без смены строк */
    let currentIndex = 2;
    let animating = false;
    let shiftsDone = 0;
    /** После третьего скролла (панорама) — ещё держим wheel с preventDefault, иначе следующие события того же жеста прокрутят страницу */
    let panWheelHandled = false;
    let scrollToTest14Initialized = false;

    const test14SlideWrap = document.querySelector(".page > .wrapper:nth-child(2) .slide-photo-wrap");
    const test14Img = test14SlideWrap && test14SlideWrap.querySelector(".photo");
    let test14NoMotionTimer;

    function disableTest14MotionTemporarily() {
        if (!test14SlideWrap) return;
        test14SlideWrap.classList.add("no-motion");
        clearTimeout(test14NoMotionTimer);
        test14NoMotionTimer = setTimeout(() => {
            test14SlideWrap.classList.remove("no-motion");
        }, 140);
    }

    /** Вертикальный overflow при cover — на сколько пикселей смещается кадр при object-position bottom → top */
    function syncTest14TextPanY() {
        if (!test14SlideWrap || !test14Img || !test14Img.naturalWidth || !test14Img.naturalHeight) return;
        const boxW = test14Img.clientWidth;
        const boxH = test14Img.clientHeight;
        if (!boxW || !boxH) return;
        const imgRatio = test14Img.naturalWidth / test14Img.naturalHeight;
        const boxRatio = boxW / boxH;
        const renderedH = imgRatio > boxRatio ? boxH : boxW / imgRatio;
        const overflowY = Math.max(0, renderedH - boxH);
        test14SlideWrap.style.setProperty("--test14-text-pan-y", `${overflowY.toFixed(2)}px`);
    }

    if (test14SlideWrap && test14Img) {
        const enableTest14PanTransition = () => {
            test14SlideWrap.classList.add("photo-pan-interactive");
            requestAnimationFrame(() => requestAnimationFrame(syncTest14TextPanY));
        };
        if (test14Img.complete) {
            requestAnimationFrame(() => requestAnimationFrame(enableTest14PanTransition));
        } else {
            test14Img.addEventListener(
                "load",
                () => {
                    requestAnimationFrame(() => requestAnimationFrame(enableTest14PanTransition));
                },
                { once: true }
            );
        }
        if (typeof ResizeObserver !== "undefined") {
            new ResizeObserver(() => {
                disableTest14MotionTemporarily();
                syncTest14TextPanY();
            }).observe(test14SlideWrap);
        }
        window.addEventListener("resize", () => {
            disableTest14MotionTemporarily();
            syncTest14TextPanY();
        });
    }

    /** После сценария с колесом: следующий скролл вниз с экрана со статичным текстом — плавно показать целиком слайд с test14, колесо блокируется на время анимации */
    function initScrollToTest14OnWheel() {
        if (scrollToTest14Initialized) return;
        scrollToTest14Initialized = true;

        const staticTextEl = document.querySelector(".page > .wrapper:first-child .photo-static-text");
        const test14Wrapper = document.querySelector(".page > .wrapper:nth-child(2)");
        if (!test14Wrapper) return;

        let test14VerticalPanDone = false;
        let test14VerticalPanAnimating = false;
        const test14PanDurationMs = 2200;

        let userSeesTextScreen = false;
        if (staticTextEl && typeof IntersectionObserver !== "undefined") {
            const io = new IntersectionObserver(
                (entries) => {
                    for (const en of entries) {
                        if (en.isIntersecting && en.intersectionRatio >= 0.15) userSeesTextScreen = true;
                    }
                },
                { threshold: [0, 0.15, 0.35] }
            );
            io.observe(staticTextEl);
        } else {
            userSeesTextScreen = true;
        }

        requestAnimationFrame(() => {
            if (staticTextEl) {
                const r = staticTextEl.getBoundingClientRect();
                if (r.top < window.innerHeight && r.bottom > 0) userSeesTextScreen = true;
            }
        });

        let scrollAnimating = false;

        function isTest14FullyVisible() {
            const r = test14Wrapper.getBoundingClientRect();
            const pad = 4;
            return r.top >= -pad && r.bottom <= window.innerHeight + pad;
        }

        function targetYToShowTest14() {
            const h = test14Wrapper.offsetHeight;
            const vh = window.innerHeight;
            const top = test14Wrapper.offsetTop;
            if (h >= vh) return Math.max(0, top);
            return Math.max(0, top - (vh - h) / 2);
        }

        function smoothScrollWindowTo(targetY, durationMs, done) {
            const startY = window.scrollY;
            const dist = targetY - startY;
            const t0 = performance.now();

            function frame(now) {
                const t = Math.min((now - t0) / durationMs, 1);
                const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                window.scrollTo(0, startY + dist * ease);
                if (t < 1) requestAnimationFrame(frame);
                else if (typeof done === "function") done();
            }
            requestAnimationFrame(frame);
        }

        function handlePostPoemWheel(e) {
            if (e.deltaY <= 0) return;

            if (test14VerticalPanAnimating) {
                e.preventDefault();
                return;
            }

            if (scrollAnimating) {
                e.preventDefault();
                return;
            }

            if (!userSeesTextScreen) return;

            if (isTest14FullyVisible()) {
                if (!test14VerticalPanDone && test14SlideWrap) {
                    e.preventDefault();
                    test14VerticalPanAnimating = true;
                    syncTest14TextPanY();
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            test14SlideWrap.classList.add("photo-pan-vertical-shift");
                        });
                    });
                    setTimeout(() => {
                        test14VerticalPanDone = true;
                        test14VerticalPanAnimating = false;
                    }, test14PanDurationMs);
                }
                return;
            }

            e.preventDefault();
            scrollAnimating = true;
            const dest = targetYToShowTest14();
            const duration = 1500;
            smoothScrollWindowTo(dest, duration, () => {
                scrollAnimating = false;
            });
        }

        window.addEventListener("wheel", handlePostPoemWheel, { passive: false });
    }

    function createLine(text) {
        const div = document.createElement("div");
        div.className = "line-item";
        div.textContent = text;
        return div;
    }

    function init() {
        linesContainer.innerHTML = "";
        linesContainer.appendChild(createLine(poemLines[0]));
        linesContainer.appendChild(createLine(poemLines[1]));
    }

    init();

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(scheduleFitTwoLinesFont);
    } else {
        scheduleFitTwoLinesFont();
    }

    function shiftLines() {
        if (animating) return;
        animating = true;

        const oldLines = Array.from(linesContainer.children);

        // Уход старых строк вверх
        oldLines.forEach(el => {
            el.classList.remove("enter", "enter-active");
            el.classList.add("leave");
            // запуск анимации
            requestAnimationFrame(() => {
                el.classList.add("leave-active");
            });
        });

        // Через короткое время убираем старые и добавляем новые
        setTimeout(() => {
            linesContainer.innerHTML = "";

            let added = 0;
            const newLines = [];
            while (currentIndex < poemLines.length && added < 2) {
                const newLine = createLine(poemLines[currentIndex]);
                newLine.classList.add("enter");
                linesContainer.appendChild(newLine);
                newLines.push(newLine);

                currentIndex++;
                added++;
            }

            setTimeout(() => {
                newLines.forEach(el => el.classList.add("enter-active"));
                scheduleFitTwoLinesFont();
            }, 50);

            if (hint && shiftsDone === 0) {
                hint.classList.add("hidden");
            }

            shiftsDone++;

            if (shiftsDone === 1 && photoStage) {
                photoStage.classList.add("zoomed");
            }

            animating = false;
        }, 350); // быстрый переход, почти без "белого" промежутка
    }

    function handleWheel(e) {
        if (e.deltaY <= 0) return;

        if (panWheelHandled) {
            e.preventDefault();
            return;
        }

        e.preventDefault();

        if (shiftsDone === 0) {
            shiftLines();
            return;
        }
        if (shiftsDone === 1) {
            shiftLines();
            return;
        }
        if (shiftsDone === 2) {
            panWheelHandled = true;
            if (photoStage) photoStage.classList.add("photo-pan-shift");
            if (firstWrapper) firstWrapper.classList.add("lines-pan-shift");
            /* 2.2s transform + запас; пока слушатель жив — все wheel вниз гасим */
            const unlockMs = 3200;
            setTimeout(() => {
                window.removeEventListener("wheel", handleWheel, { passive: false });
                initScrollToTest14OnWheel();
            }, unlockMs);
        }
    }

    window.addEventListener("wheel", handleWheel, { passive: false });
})();

// Smooth section snapping with JS
(function() {
    let isScrolling = false;
    let scrollTimeout;

    // Custom smooth scroll function
    function smoothScrollTo(targetY, duration = 2000) {
        const startY = window.scrollY;
        const distance = targetY - startY;
        const startTime = performance.now();

        function animation(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeInOut = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            window.scrollTo(0, startY + distance * easeInOut);

            if (progress < 1) {
                requestAnimationFrame(animation);
            }
        }

        requestAnimationFrame(animation);
    }

    window.addEventListener('scroll', () => {
        if (isScrolling) return;

        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const sections = document.querySelectorAll('.section');
            const scrollY = window.scrollY + window.innerHeight / 1.6; // center of viewport

            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionBottom = sectionTop + section.offsetHeight;

                if (scrollY >= sectionTop && scrollY < sectionBottom) {
                    isScrolling = true;
                    smoothScrollTo(sectionTop, 500); // 2.5 seconds
                    setTimeout(() => isScrolling = false, 3000); // allow more time
                }
            });
        }, 100); // debounce
    });
})();
